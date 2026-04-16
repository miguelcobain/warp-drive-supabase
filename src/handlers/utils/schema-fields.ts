import { pluralizeType, underscore } from '../../utils/string';

interface SchemaFieldLike {
  kind: string;
  name?: string;
  sourceKey?: string;
}

export function getFieldName(field: SchemaFieldLike, fallbackKey: string): string {
  return field.name ?? fallbackKey;
}

export function getFieldSourceKey(field: SchemaFieldLike, fallbackKey: string): string {
  return field.sourceKey ?? underscore(getFieldName(field, fallbackKey));
}

export function getRelationshipIdKey(field: SchemaFieldLike, fallbackKey: string): string {
  return `${getFieldSourceKey(field, fallbackKey)}_id`;
}

export function getRelationshipIncludeKey(field: SchemaFieldLike, fallbackKey: string): string {
  return pluralizeType(getFieldSourceKey(field, fallbackKey));
}

export function isAttributeField(field: SchemaFieldLike): boolean {
  return field.kind === 'attribute' || field.kind === 'field';
}

export function isToOneRelationshipField(field: SchemaFieldLike): boolean {
  return field.kind === 'belongsTo' || field.kind === 'resource';
}

export function isToManyRelationshipField(field: SchemaFieldLike): boolean {
  return field.kind === 'hasMany' || field.kind === 'collection';
}
