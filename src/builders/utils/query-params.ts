import { pluralizeType, underscore } from '../../utils/string';

type IncludeNode = Map<string, IncludeNode>;

function normalizeValues(values: string | string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  return (Array.isArray(values) ? values : values.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function addIncludePath(tree: IncludeNode, path: string): void {
  let cursor = tree;
  for (const segment of path.split('.')) {
    const normalizedSegment = segment.trim();
    if (!normalizedSegment) {
      continue;
    }

    let branch = cursor.get(normalizedSegment);
    if (!branch) {
      branch = new Map<string, IncludeNode>();
      cursor.set(normalizedSegment, branch);
    }
    cursor = branch;
  }
}

function serializeIncludeBranch([name, children]: [string, IncludeNode]): string {
  const nested = Array.from(children.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map((entry) => serializeIncludeBranch(entry))
    .join(',');

  const content = nested ? `*,${nested}` : '*';
  return `${pluralizeType(underscore(name))}(${content})`;
}

export function serializeIncludes(paths: string | string[] = []): string[] {
  const includeTree: IncludeNode = new Map<string, IncludeNode>();

  for (const include of normalizeValues(paths)) {
    addIncludePath(includeTree, include);
  }

  return Array.from(includeTree.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map((entry) => serializeIncludeBranch(entry));
}

export function serializePostgrestSelect(
  includes: string | string[] = [],
  fields: string | string[] = []
): string {
  const serializedFields = serializePostgrestFields(normalizeValues(fields));
  const serializedIncludes = serializeIncludes(includes);
  const segments = serializedFields ? serializedFields.split(',') : ['*'];

  return [...segments, ...serializedIncludes].join(',');
}

export function serializePostgrestOrder(orders: string[] = []): string {
  return [...new Set(normalizeValues(orders))].sort().join(',');
}

export function serializePostgrestFields(fields: string[] = []): string {
  return [...new Set(normalizeValues(fields))].sort().join(',');
}
