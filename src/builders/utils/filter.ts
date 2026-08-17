import type { TypedRecordInstance } from '@warp-drive/core/types/record';

import type { SupabaseRow } from '../supabase-table';

type ScalarFieldValue = string | number | boolean | bigint | null | undefined;

type SnakeCase<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Tail extends Uncapitalize<Tail>
    ? `${Lowercase<Head>}${SnakeCase<Tail>}`
    : `${Lowercase<Head>}_${SnakeCase<Tail>}`
  : S;

type StringKey<T> = Exclude<Extract<keyof T, string>, '$type'>;

type ScalarFieldKey<T> = {
  [K in StringKey<T>]: NonNullable<T[K]> extends ScalarFieldValue ? K : never;
}[StringKey<T>];

type BestGuessFieldMap<T> = {
  [K in ScalarFieldKey<T> as SnakeCase<K>]: T[K];
};

type BaseFieldMap<T> = [SupabaseRow<T>] extends [never]
  ? BestGuessFieldMap<T>
  : {
      [K in Extract<keyof SupabaseRow<T>, string>]: SupabaseRow<T>[K];
    };

type RelatedRecord<Value> =
  NonNullable<Value> extends ReadonlyArray<infer Item>
    ? Item extends TypedRecordInstance
      ? Item
      : never
    : NonNullable<Value> extends TypedRecordInstance
      ? NonNullable<Value>
      : never;

type RelationshipKey<T> = {
  [K in StringKey<T>]: [RelatedRecord<T[K]>] extends [never] ? never : K;
}[StringKey<T>];

declare const RelationshipReferenceType: unique symbol;

interface RelationshipReference {
  readonly [RelationshipReferenceType]: true;
}

type UnionToIntersection<Union> = (
  Union extends unknown ? (value: Union) => void : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never;

type Tail<Depth extends readonly unknown[]> = Depth extends readonly [
  unknown,
  ...infer Rest,
]
  ? Rest
  : [];

type PrefixFieldMap<Map, Prefix extends string> = {
  [K in Extract<keyof Map, string> as `${Prefix}.${K}`]: Map[K];
};

type RelationshipBranch<
  T,
  Key extends RelationshipKey<T>,
  Depth extends readonly unknown[],
> = {
  [K in SnakeCase<Key>]: RelationshipReference;
} & PrefixFieldMap<
  FilterFieldMap<RelatedRecord<T[Key]>, Tail<Depth>>,
  SnakeCase<Key>
>;

type RelationshipFieldMap<
  T,
  Depth extends readonly unknown[],
> = Depth extends readonly []
  ? {}
  : [RelationshipKey<T>] extends [never]
    ? {}
    : UnionToIntersection<
        {
          [K in RelationshipKey<T>]: RelationshipBranch<T, K, Depth>;
        }[RelationshipKey<T>]
      >;

type DefaultRelationshipDepth = [unknown, unknown, unknown, unknown, unknown];

type FilterFieldMap<
  T,
  Depth extends readonly unknown[] = DefaultRelationshipDepth,
> = BaseFieldMap<T> & RelationshipFieldMap<T, Depth>;

type Defined<Value> = Exclude<Value, undefined>;
type ComparableValue<Value> = Exclude<Defined<Value>, null>;

type AnyModifier<Value> = {
  any: readonly Value[];
  all?: never;
};

type AllModifier<Value> = {
  all: readonly Value[];
  any?: never;
};

type ModifiedValue<Value> = Value | AnyModifier<Value> | AllModifier<Value>;

type DeepPartial<Value> =
  Value extends ReadonlyArray<infer Item>
    ? readonly DeepPartial<Item>[]
    : Value extends object
      ? { [K in keyof Value]?: DeepPartial<Value[K]> }
      : Value;

type CollectionValue<Value> = DeepPartial<Defined<Value>>;

export interface FullTextFilter {
  query: string;
  config?: string;
}

type PatternOperators<Value> = [
  Extract<ComparableValue<Value>, string>,
] extends [never]
  ? {
      like?: never;
      ilike?: never;
      match?: never;
      imatch?: never;
    }
  : {
      like?: ModifiedValue<string> | undefined;
      ilike?: ModifiedValue<string> | undefined;
      match?: ModifiedValue<string> | undefined;
      imatch?: ModifiedValue<string> | undefined;
    };

type FullTextOperators<Value> = [
  Extract<Defined<Value>, string | object>,
] extends [never]
  ? {
      fts?: never;
      plfts?: never;
      phfts?: never;
      wfts?: never;
    }
  : {
      fts?: FullTextFilter | undefined;
      plfts?: FullTextFilter | undefined;
      phfts?: FullTextFilter | undefined;
      wfts?: FullTextFilter | undefined;
    };

type IsFilterValue<Value> =
  | null
  | 'not_null'
  | ([Extract<Defined<Value>, boolean>] extends [never]
      ? never
      : boolean | 'unknown');

type FieldOperators<Value> = {
  eq?: ModifiedValue<ComparableValue<Value>> | undefined;
  neq?: ComparableValue<Value> | undefined;
  gt?: ModifiedValue<ComparableValue<Value>> | undefined;
  gte?: ModifiedValue<ComparableValue<Value>> | undefined;
  lt?: ModifiedValue<ComparableValue<Value>> | undefined;
  lte?: ModifiedValue<ComparableValue<Value>> | undefined;
  in?: readonly ComparableValue<Value>[] | undefined;
  is?: IsFilterValue<Value> | undefined;
  isdistinct?: Defined<Value> | undefined;
  cs?: CollectionValue<Value> | undefined;
  cd?: CollectionValue<Value> | undefined;
  ov?: CollectionValue<Value> | undefined;
  sl?: Defined<Value> | undefined;
  sr?: Defined<Value> | undefined;
  nxr?: Defined<Value> | undefined;
  nxl?: Defined<Value> | undefined;
  adj?: Defined<Value> | undefined;
} & PatternOperators<Value> &
  FullTextOperators<Value>;

export type FieldPredicate<Value> = FieldOperators<Value> & {
  not?: FieldOperators<Value> | undefined;
};

type RelationshipPredicate = {
  is?: null | 'not_null' | undefined;
  not?:
    | {
        is: null | 'not_null';
      }
    | undefined;
};

type PredicateFor<Value> = [Value] extends [RelationshipReference]
  ? RelationshipPredicate
  : FieldPredicate<Value>;

export interface RawFilter {
  field: string;
  value: string;
}

type FilterLogic<T> = {
  $and?: readonly FilterExpression<T>[] | undefined;
  $or?: readonly FilterExpression<T>[] | undefined;
  $not?: FilterExpression<T> | undefined;
  $raw?: RawFilter | undefined;
};

type TypedFilter<T extends TypedRecordInstance> = {
  [K in Extract<keyof FilterFieldMap<T>, string>]?:
    | PredicateFor<FilterFieldMap<T>[K]>
    | undefined;
} & FilterLogic<T>;

type UntypedFilterValue =
  | FieldPredicate<any>
  | readonly UntypedFilter[]
  | UntypedFilter
  | RawFilter
  | undefined;

interface UntypedFilter {
  [key: string]: UntypedFilterValue;
}

export type Filter<T = unknown> = T extends TypedRecordInstance
  ? TypedFilter<T>
  : UntypedFilter;

export type FilterExpression<T = unknown> = Filter<T>;

export type FilterField<T extends TypedRecordInstance> = Extract<
  keyof FilterFieldMap<T>,
  string
>;

const MODIFIED_OPERATORS = new Set([
  'eq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'match',
  'imatch',
]);

const SIMPLE_OPERATORS = new Set([
  'neq',
  'isdistinct',
  'sl',
  'sr',
  'nxr',
  'nxl',
  'adj',
]);

const COLLECTION_OPERATORS = new Set(['cs', 'cd', 'ov']);
const FULL_TEXT_OPERATORS = new Set(['fts', 'plfts', 'phfts', 'wfts']);

export function appendPostgrestFilter(
  filter: unknown,
  searchParams: URLSearchParams,
): void {
  const entries = definedEntries(assertObject(filter, 'filter'));
  if (!entries.length) {
    throw new RangeError('filter must contain at least one expression.');
  }

  for (const [key, value] of entries) {
    if (key === '$raw') {
      const raw = assertRawFilter(value);
      searchParams.append(raw.field, raw.value);
    } else if (key === '$and' || key === '$or') {
      searchParams.append(key.slice(1), serializeLogicalArray(key, value));
    } else if (key === '$not') {
      const terms = compileExpressionTerms(value);
      searchParams.append('not.and', `(${terms.join(',')})`);
    } else if (key.startsWith('$')) {
      throw new TypeError(`Unknown filter expression ${key}.`);
    } else {
      for (const serialized of compileFieldPredicate(key, value)) {
        searchParams.append(key, serialized);
      }
    }
  }
}

function compileExpressionTerms(expression: unknown): string[] {
  const entries = definedEntries(assertObject(expression, 'filter expression'));
  if (!entries.length) {
    throw new RangeError(
      'filter expression must contain at least one expression.',
    );
  }

  const terms: string[] = [];
  for (const [key, value] of entries) {
    if (key === '$raw') {
      const raw = assertRawFilter(value);
      terms.push(`${raw.field}.${raw.value}`);
    } else if (key === '$and' || key === '$or') {
      terms.push(`${key.slice(1)}${serializeLogicalArray(key, value)}`);
    } else if (key === '$not') {
      const nested = compileExpressionTerms(value);
      terms.push(`not.and(${nested.join(',')})`);
    } else if (key.startsWith('$')) {
      throw new TypeError(`Unknown filter expression ${key}.`);
    } else {
      for (const serialized of compileFieldPredicate(key, value)) {
        terms.push(`${key}.${serialized}`);
      }
    }
  }

  return terms;
}

function compileExpression(expression: unknown): string {
  const terms = compileExpressionTerms(expression);
  return terms.length === 1 ? terms[0]! : `and(${terms.join(',')})`;
}

function serializeLogicalArray(name: string, value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError(`${name} must contain at least one expression.`);
  }

  return `(${value.map((expression) => compileExpression(expression)).join(',')})`;
}

function compileFieldPredicate(field: string, value: unknown): string[] {
  if (!field) {
    throw new RangeError('filter fields must not be empty.');
  }

  const entries = definedEntries(assertObject(value, `filter.${field}`));
  if (!entries.length) {
    throw new RangeError(`filter.${field} must contain at least one operator.`);
  }

  const operators: string[] = [];
  for (const [operator, operand] of entries) {
    if (operator === 'not') {
      for (const serialized of compileOperators(field, operand, false)) {
        operators.push(`not.${serialized}`);
      }
    } else {
      operators.push(compileOperator(field, operator, operand));
    }
  }

  return operators;
}

function compileOperators(
  field: string,
  value: unknown,
  allowNot: boolean,
): string[] {
  const entries = definedEntries(assertObject(value, `filter.${field}`));
  if (!entries.length) {
    throw new RangeError(`filter.${field} must contain at least one operator.`);
  }

  return entries.map(([operator, operand]) => {
    if (operator === 'not' && !allowNot) {
      throw new TypeError(`filter.${field}.not cannot contain another not.`);
    }
    return compileOperator(field, operator, operand);
  });
}

function compileOperator(
  field: string,
  operator: string,
  operand: unknown,
): string {
  if (MODIFIED_OPERATORS.has(operator)) {
    return serializeModifiedOperator(field, operator, operand);
  }
  if (SIMPLE_OPERATORS.has(operator)) {
    return `${operator}.${serializeValue(operand)}`;
  }
  if (operator === 'in') {
    return `in.${serializeNonEmptyList(field, operator, operand, '(', ')')}`;
  }
  if (operator === 'is') {
    return `is.${serializeIsValue(field, operand)}`;
  }
  if (COLLECTION_OPERATORS.has(operator)) {
    return `${operator}.${serializeCollectionValue(operand)}`;
  }
  if (FULL_TEXT_OPERATORS.has(operator)) {
    return serializeFullTextFilter(field, operator, operand);
  }

  throw new TypeError(`Unknown filter operator ${operator} on ${field}.`);
}

function serializeModifiedOperator(
  field: string,
  operator: string,
  operand: unknown,
): string {
  if (isPlainObject(operand) && ('any' in operand || 'all' in operand)) {
    const entries = definedEntries(operand);
    if (
      entries.length !== 1 ||
      (entries[0]![0] !== 'any' && entries[0]![0] !== 'all')
    ) {
      throw new TypeError(
        `filter.${field}.${operator} must specify exactly one of any or all.`,
      );
    }

    const [modifier, values] = entries[0]!;
    return `${operator}(${modifier}).${serializeNonEmptyList(
      field,
      `${operator}.${modifier}`,
      values,
      '{',
      '}',
    )}`;
  }

  return `${operator}.${serializeValue(operand)}`;
}

function serializeFullTextFilter(
  field: string,
  operator: string,
  operand: unknown,
): string {
  const input = assertObject(operand, `filter.${field}.${operator}`);
  const keys = Object.keys(input);
  if (
    keys.some((key) => key !== 'query' && key !== 'config') ||
    typeof input.query !== 'string' ||
    input.query.length === 0
  ) {
    throw new TypeError(
      `filter.${field}.${operator} requires a non-empty query and optional config.`,
    );
  }

  let config = '';
  if (input.config !== undefined) {
    if (
      typeof input.config !== 'string' ||
      input.config.length === 0 ||
      /[(),]/.test(input.config)
    ) {
      throw new TypeError(
        `filter.${field}.${operator}.config is not a valid PostgREST configuration.`,
      );
    }
    config = `(${input.config})`;
  }

  return `${operator}${config}.${quotePostgrestValue(input.query)}`;
}

function serializeIsValue(field: string, value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (
    typeof value === 'boolean' ||
    value === 'unknown' ||
    value === 'not_null'
  ) {
    return String(value);
  }
  throw new TypeError(`filter.${field}.is has an invalid value.`);
}

function serializeCollectionValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `{${value.map(serializeValue).join(',')}}`;
  }
  return serializeValue(value);
}

function serializeNonEmptyList(
  field: string,
  operator: string,
  value: unknown,
  open: string,
  close: string,
): string {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError(
      `filter.${field}.${operator} must contain at least one value.`,
    );
  }
  return `${open}${value.map(serializeValue).join(',')}${close}`;
}

function serializeValue(value: unknown): string {
  if (typeof value === 'string') {
    return quotePostgrestValue(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('PostgREST filter numbers must be finite.');
    }
    return String(value);
  }
  if (typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null) {
    return 'null';
  }
  if (value instanceof Date) {
    return quotePostgrestValue(value.toISOString());
  }
  if (typeof value === 'object' && value !== null) {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new TypeError('PostgREST filter values must be serializable.');
    }
    return quotePostgrestValue(serialized);
  }
  throw new TypeError('PostgREST filter values must be serializable.');
}

function quotePostgrestValue(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function assertRawFilter(value: unknown): RawFilter {
  const raw = assertObject(value, '$raw');
  const keys = Object.keys(raw);
  if (
    keys.length !== 2 ||
    !keys.includes('field') ||
    !keys.includes('value') ||
    typeof raw.field !== 'string' ||
    raw.field.length === 0 ||
    typeof raw.value !== 'string' ||
    raw.value.length === 0
  ) {
    throw new RangeError(
      '$raw requires non-empty field and value string properties.',
    );
  }
  return { field: raw.field, value: raw.value };
}

function assertObject(value: unknown, name: string): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new TypeError(`${name} must be an object.`);
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function definedEntries(
  value: Record<string, unknown>,
): Array<[string, unknown]> {
  return Object.entries(value).filter((entry) => entry[1] !== undefined);
}
