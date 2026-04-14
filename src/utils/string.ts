import pluralize from 'pluralize';

export function underscore(value: string): string {
  return value
    .replace(/([a-z\d])([A-Z]+)/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

export function pluralizeType(value: string): string {
  return pluralize(value);
}
