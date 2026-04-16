import type { SchemaService } from '@warp-drive/core/types';
import {
  getFieldName,
  getFieldSourceKey,
  getRelationshipIdKey,
  getRelationshipIncludeKey,
  isAttributeField,
  isToManyRelationshipField,
  isToOneRelationshipField,
} from './schema-fields';

interface JSONAPIRelationship {
  data: { id: string; type: string } | null,
  meta?: Record<string, unknown>,
  links?: Record<string, unknown>
}

interface JSONAPIResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships: Record<
    string,
    JSONAPIRelationship
  >;
}

interface JSONAPIResponse {
  data: JSONAPIResource | JSONAPIResource[] | null;
  included?: JSONAPIResource[];
}

export function serializeToJsonAPI(
  schemaService: SchemaService,
  input: Record<string, any> | Record<string, any>[] | null,
  type: string
): JSONAPIResponse {
  const includedMap = new Map<string, JSONAPIResource>();

  function getSchemaForType(type: string) {
    return schemaService.fields({ type });
  }

  function serializeRecord(
    record: Record<string, any>,
    type: string,
    trail = new Set<string>()
  ): JSONAPIResource {
    const schema = getSchemaForType(type);
    const attributes: Record<string, unknown> = {};
    const relationships: JSONAPIResource['relationships'] = {};
    const recordKey = `${type}:${record['id']}`;
    const nextTrail = new Set(trail);
    nextTrail.add(recordKey);

    for (const [key, field] of schema.entries()) {
      if (key === 'id') continue;

      if (isAttributeField(field)) {
        const attributeKey = getFieldSourceKey(field, key);
        if (attributeKey in record) {
          attributes[attributeKey] = record[attributeKey];
        }
      } else if (isToOneRelationshipField(field)) {
        const relationshipName = getFieldName(field, key);
        const relId = record[getRelationshipIdKey(field, key)];
        const relType = field.type;
        if (typeof relType !== 'string') {
          continue;
        }
        relationships[relationshipName] = {
          data: relId ? { id: String(relId), type: relType } : null,
        };

        const includedRel = record[getRelationshipIncludeKey(field, key)];
        if (includedRel?.id) {
          const includedMapKey = `${relType}-${includedRel.id}`;
          if (!includedMap.has(includedMapKey)) {
            const nestedRecordKey = `${relType}:${includedRel.id}`;
            if (nextTrail.has(nestedRecordKey)) {
              continue;
            }
            const serialized = serializeRecord(includedRel, relType, nextTrail);
            includedMap.set(includedMapKey, serialized);
          }
        }
      } else if (isToManyRelationshipField(field)) {
        const relationshipName = getFieldName(field, key);
        const rels = Array.isArray(record[getRelationshipIncludeKey(field, key)])
          ? record[getRelationshipIncludeKey(field, key)]
          : null;
        const relType = field.type;
        if (typeof relType !== 'string') {
          continue;
        }

        if (!rels) {
          continue;
        }

        relationships[relationshipName] = {
          data: rels.map((rel: any) => ({ id: String(rel.id), type: relType })),
        };

        for (const rel of rels) {
          if (rel?.id) {
            const includedMapKey = `${relType}-${rel.id}`;
            if (!includedMap.has(includedMapKey)) {
              const nestedRecordKey = `${relType}:${rel.id}`;
              if (nextTrail.has(nestedRecordKey)) {
                continue;
              }
              const serialized = serializeRecord(rel, relType, nextTrail);
              includedMap.set(includedMapKey, serialized);
            }
          }
        }
      }
    }

    return {
      id: String(record['id']),
      type,
      attributes,
      relationships,
    };
  }

  if (input === null) {
    return { data: null };
  }

  const isArray = Array.isArray(input);
  const data = isArray
    ? input.map((record) => serializeRecord(record, type))
    : serializeRecord(input, type);

  return {
    data,
    ...(includedMap.size ? { included: Array.from(includedMap.values()) } : {}),
  };
}
