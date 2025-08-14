import { assert } from '@ember/debug';
import { pluralize, underscore } from '@warp-drive/utilities/string';

export function serializeIncludes(paths: string | string[]): string[] {
  let normalizedPaths = Array.isArray(paths) ? paths : paths.split(',');

  return [
    '*',
    ...normalizedPaths.map((include) => {
      const [first, ...remaining] = include.split('.');

      assert('serializeIncludes requires at least one path segment', typeof first === 'string');

      return `${pluralize(underscore(first))}(${serializeIncludes(remaining)})`;
    }),
  ];
}


export function serializePostgrestSelect(includes: string | string[] = []): string {
  return [
    ...serializeIncludes(includes),
  ].join(',');
}
