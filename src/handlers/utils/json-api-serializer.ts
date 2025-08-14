import type { SchemaService } from '@warp-drive/core/types';
import { pluralize, underscore } from '@warp-drive/utilities/string';

interface JSONAPIRelationship {
  data: { id: string; type: string } | null,
  meta?: Record<string, unknown>
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
  data: JSONAPIResource | JSONAPIResource[];
  included?: JSONAPIResource[];
}

export function serializeToJsonAPI(
  schemaService: SchemaService,
  input: Record<string, any> | Record<string, any>[],
  type: string
): JSONAPIResponse {
  const includedMap = new Map<string, JSONAPIResource>();

  function getSchemaForType(type: string) {
    return schemaService.fields({ type });
  }

  function serializeRecord(
    record: Record<string, any>,
    type: string
  ): JSONAPIResource {
    const schema = getSchemaForType(type);
    const attributes: Record<string, unknown> = {};
    const relationships: JSONAPIResource['relationships'] = {};

    for (const [key, field] of schema.entries()) {
      if (key === 'id') continue;

      if (field.kind === 'attribute') {
        attributes[key] = record[underscore(key)];
      } else if (field.kind === 'belongsTo') {
        const relId = record[`${underscore(key)}_id`];
        const relType = field.type;
        relationships[field.name] = {
          data: relId ? { id: relId, type: relType } : null,
        };

        const includedRel = record[pluralize(field.name)];
        if (includedRel?.id) {
          const includedMapKey = `${relType}-${includedRel.id}`;
          if (!includedMap.has(includedMapKey)) {
            const serialized = serializeRecord(includedRel, relType);
            includedMap.set(includedMapKey, serialized);
          }
        }
      } else if (field.kind === 'hasMany') {
        const rels = Array.isArray(record[pluralize(field.name)]) ? record[pluralize(field.name)] : null;
        const relType = field.type;

        if (!rels) {
          continue;
        }

        relationships[field.name] = {
          data: rels.map((rel: any) => ({ id: rel.id, type: relType })),
        };

        for (const rel of rels) {
          if (rel?.id) {
            const includedMapKey = `${relType}-${rel.id}`;
            if (!includedMap.has(includedMapKey)) {
              const serialized = serializeRecord(rel, relType);
              includedMap.set(includedMapKey, serialized);
            }
          }
        }
      }
    }

    return {
      id: record['id'],
      type,
      attributes,
      relationships,
    };
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
