import type { PageOptions, PostgrestCountMode } from '../../pagination';

export type OrderDirection = 'asc' | 'desc';
export type OrderNulls = 'first' | 'last';
export type RelationshipCardinality = 'one' | 'many';

export interface OrderOptions {
  direction?: OrderDirection;
  nulls?: OrderNulls;
}

export interface QuantifierOptions {
  quantifier: 'any' | 'all';
}

export interface FullTextOptions {
  config?: string;
}

export interface EmbedOptions<
  ForeignKey extends string = string,
  Alias extends string = string,
> {
  as?: Alias;
  using?: ForeignKey;
  join?: 'left' | 'inner';
}

type StringKey<T> = Extract<keyof T, string>;
type Field<Row> = string extends StringKey<Row> ? string : StringKey<Row>;
type FieldValue<Row, Key extends string> = Key extends keyof Row
  ? Exclude<Row[Key], undefined>
  : unknown;
type ComparableValue<Row, Key extends string> = FieldValue<Row, Key>;
type StringField<Row> = {
  [Key in StringKey<Row>]: Extract<
    Exclude<Row[Key], null | undefined>,
    string
  > extends never
    ? never
    : Key;
}[StringKey<Row>];
type PatternField<Row> =
  string extends StringKey<Row> ? string : StringField<Row>;
type FullTextField<Row> = {
  [Key in StringKey<Row>]: Extract<
    Exclude<Row[Key], null | undefined>,
    string | object
  > extends never
    ? never
    : Key;
}[StringKey<Row>];
type SearchableField<Row> =
  string extends StringKey<Row> ? string : FullTextField<Row>;
type DeepPartial<Value> = Value extends readonly (infer Item)[]
  ? readonly DeepPartial<Item>[]
  : Value extends object
    ? { [Key in keyof Value]?: DeepPartial<Value[Key]> }
    : Value;
type CollectionValue<Row, Key extends string> = DeepPartial<
  FieldValue<Row, Key>
>;
type IsValue<Row, Key extends string> =
  | null
  | 'not_null'
  | (Key extends keyof Row
      ? Extract<Exclude<Row[Key], null | undefined>, boolean> extends never
        ? never
        : boolean | 'unknown'
      : boolean | 'unknown');

type SchemaOf<Context> = Context extends {
  database: infer Database;
  schema: infer Schema;
}
  ? Schema extends keyof Database
    ? Database[Schema]
    : never
  : never;

type TablesOf<Context> =
  SchemaOf<Context> extends { Tables: infer Tables } ? Tables : never;
type TableName<Context> = Extract<keyof TablesOf<Context>, string>;
type CurrentTable<Context> = Context extends { table: infer Table }
  ? Extract<Table, string>
  : never;
type TableDefinition<
  Context,
  Table extends string,
> = Table extends keyof TablesOf<Context> ? TablesOf<Context>[Table] : never;
type RowFor<Context, Table extends string> =
  TableDefinition<Context, Table> extends infer Definition
    ? [Definition] extends [never]
      ? Record<string, unknown>
      : Definition extends { Row: infer Row }
        ? Row
        : Record<string, unknown>
    : Record<string, unknown>;
type RelationshipsFor<Context, Table extends string> =
  TableDefinition<Context, Table> extends {
    Relationships: readonly (infer Relationship)[];
  }
    ? Relationship
    : never;
type ReferencedRelation<Relationship> = Relationship extends {
  referencedRelation: infer Relation;
}
  ? Extract<Relation, string>
  : never;
type ForeignKeyName<Relationship> = Relationship extends {
  foreignKeyName: infer Name;
}
  ? Extract<Name, string>
  : never;

type OutgoingRelationship<Context, Target extends string> = Extract<
  RelationshipsFor<Context, CurrentTable<Context>>,
  { referencedRelation: Target }
>;
type ReverseRelationship<Context, Target extends string> = Extract<
  RelationshipsFor<Context, Target>,
  { referencedRelation: CurrentTable<Context> }
>;

type OutgoingTable<Context> = ReferencedRelation<
  RelationshipsFor<Context, CurrentTable<Context>>
> &
  TableName<Context>;
type ReverseTable<Context> = {
  [Table in TableName<Context>]: [ReverseRelationship<Context, Table>] extends [
    never,
  ]
    ? never
    : Table;
}[TableName<Context>];

type RelatedTable<Context> = [Context] extends [never]
  ? string
  : OutgoingTable<Context> | ReverseTable<Context>;
type RelatedForeignKey<Context, Target extends string> = [Context] extends [
  never,
]
  ? string
  : ForeignKeyName<
      | OutgoingRelationship<Context, Target>
      | ReverseRelationship<Context, Target>
    >;
type RelatedCardinality<Context, Target extends string> = [Context] extends [
  never,
]
  ? RelationshipCardinality
  : [OutgoingRelationship<Context, Target>] extends [never]
    ? ReverseRelationship<Context, Target> extends { isOneToOne: true }
      ? 'one'
      : 'many'
    : 'one';
type ContextFor<Context, Target extends string> = Context extends {
  database: infer Database;
  schema: infer Schema;
}
  ? { database: Database; schema: Schema; table: Target }
  : never;
type Tail<Depth extends readonly unknown[]> = Depth extends readonly [
  unknown,
  ...infer Rest,
]
  ? Rest
  : [];
type DefaultDepth = [unknown, unknown, unknown, unknown, unknown];

type EmbedAllPath<
  Context,
  Depth extends readonly unknown[],
> = Depth extends readonly []
  ? never
  : [Context] extends [never]
    ? string
    : {
        [Target in RelatedTable<Context>]:
          | Target
          | `${Target}.${EmbedAllPath<ContextFor<Context, Target>, Tail<Depth>>}`;
      }[RelatedTable<Context>];

declare const EmbedReferenceType: unique symbol;

interface EmbedReference<
  Row = Record<string, unknown>,
  Cardinality extends RelationshipCardinality = RelationshipCardinality,
  Alias extends string = string,
  Direct extends boolean = boolean,
> {
  readonly [EmbedReferenceType]: {
    row: Row;
    cardinality: Cardinality;
    alias: Alias;
    direct: Direct;
  };
}

export interface EmbedRef<
  Row = Record<string, unknown>,
  Cardinality extends RelationshipCardinality = RelationshipCardinality,
  Alias extends string = string,
  Direct extends boolean = boolean,
  Context = never,
  Depth extends readonly unknown[] = any,
> extends EmbedReference<Row, Cardinality, Alias, Direct> {
  select(fields: readonly Field<Row>[]): this;
  selectAll(): this;
  selectRaw(segment: string): this;
  embedAll(paths: readonly EmbedAllPath<Context, Depth>[]): this;
  embed<
    Target extends Depth extends readonly [] ? never : RelatedTable<Context>,
  >(
    table: Target,
    configure?: EmbedCallback<
      RowFor<Context, Target>,
      ContextFor<Context, Target>,
      Tail<Depth>
    >,
  ): EmbedRef<
    RowFor<Context, Target>,
    RelatedCardinality<Context, Target>,
    Extract<Target, string>,
    false,
    ContextFor<Context, Target>,
    Tail<Depth>
  >;
  embed<
    Target extends Depth extends readonly [] ? never : RelatedTable<Context>,
    const NestedAlias extends string = Extract<Target, string>,
  >(
    table: Target,
    options: EmbedOptions<RelatedForeignKey<Context, Target>, NestedAlias>,
    configure?: EmbedCallback<
      RowFor<Context, Target>,
      ContextFor<Context, Target>,
      Tail<Depth>
    >,
  ): EmbedRef<
    RowFor<Context, Target>,
    RelatedCardinality<Context, Target>,
    NestedAlias,
    false,
    ContextFor<Context, Target>,
    Tail<Depth>
  >;
  where(configure: FilterCallback<Row>): this;
  orderBy<Key extends Field<Row>>(field: Key, options?: OrderOptions): this;
  orderByRaw(value: string): this;
}

interface ComparableFilterOperator<Row> {
  <Key extends Field<Row>>(
    field: Key,
    value: ComparableValue<Row, Key>,
  ): FilterBuilder<Row>;
  <RelatedRow, Key extends Field<RelatedRow>>(
    embed: EmbedReference<RelatedRow>,
    field: Key,
    value: ComparableValue<RelatedRow, Key>,
  ): FilterBuilder<Row>;
}

interface QuantifiedComparableFilterOperator<
  Row,
> extends ComparableFilterOperator<Row> {
  <Key extends Field<Row>>(
    field: Key,
    values: readonly ComparableValue<Row, Key>[],
    options: QuantifierOptions,
  ): FilterBuilder<Row>;
  <RelatedRow, Key extends Field<RelatedRow>>(
    embed: EmbedReference<RelatedRow>,
    field: Key,
    values: readonly ComparableValue<RelatedRow, Key>[],
    options: QuantifierOptions,
  ): FilterBuilder<Row>;
}

interface PatternFilterOperator<Row> {
  <Key extends PatternField<Row>>(
    field: Key,
    value: string,
  ): FilterBuilder<Row>;
  <Key extends PatternField<Row>>(
    field: Key,
    values: readonly string[],
    options: QuantifierOptions,
  ): FilterBuilder<Row>;
  <RelatedRow, Key extends PatternField<RelatedRow>>(
    embed: EmbedReference<RelatedRow>,
    field: Key,
    value: string,
  ): FilterBuilder<Row>;
  <RelatedRow, Key extends PatternField<RelatedRow>>(
    embed: EmbedReference<RelatedRow>,
    field: Key,
    values: readonly string[],
    options: QuantifierOptions,
  ): FilterBuilder<Row>;
}

interface FullTextFilterOperator<Row> {
  <Key extends SearchableField<Row>>(
    field: Key,
    query: string,
    options?: FullTextOptions,
  ): FilterBuilder<Row>;
  <RelatedRow, Key extends SearchableField<RelatedRow>>(
    embed: EmbedReference<RelatedRow>,
    field: Key,
    query: string,
    options?: FullTextOptions,
  ): FilterBuilder<Row>;
}

interface FieldValueFilterOperator<Row> {
  <Key extends Field<Row>>(
    field: Key,
    value: FieldValue<Row, Key>,
  ): FilterBuilder<Row>;
  <RelatedRow, Key extends Field<RelatedRow>>(
    embed: EmbedReference<RelatedRow>,
    field: Key,
    value: FieldValue<RelatedRow, Key>,
  ): FilterBuilder<Row>;
}

interface CollectionFilterOperator<Row> {
  <Key extends Field<Row>>(
    field: Key,
    value: CollectionValue<Row, Key>,
  ): FilterBuilder<Row>;
  <RelatedRow, Key extends Field<RelatedRow>>(
    embed: EmbedReference<RelatedRow>,
    field: Key,
    value: CollectionValue<RelatedRow, Key>,
  ): FilterBuilder<Row>;
}

interface IsFilterOperator<Row> {
  <Key extends Field<Row>>(
    field: Key,
    value: IsValue<Row, Key>,
  ): FilterBuilder<Row>;
  <RelatedRow, Key extends Field<RelatedRow>>(
    embed: EmbedReference<RelatedRow>,
    field: Key,
    value: IsValue<RelatedRow, Key>,
  ): FilterBuilder<Row>;
}

interface InFilterOperator<Row> {
  <Key extends Field<Row>>(
    field: Key,
    values: readonly ComparableValue<Row, Key>[],
  ): FilterBuilder<Row>;
  <RelatedRow, Key extends Field<RelatedRow>>(
    embed: EmbedReference<RelatedRow>,
    field: Key,
    values: readonly ComparableValue<RelatedRow, Key>[],
  ): FilterBuilder<Row>;
}

interface RawFilterOperator<Row> {
  (field: string, value: string): FilterBuilder<Row>;
  <RelatedRow>(
    embed: EmbedReference<RelatedRow>,
    field: string,
    value: string,
  ): FilterBuilder<Row>;
}

export interface FilterBuilder<Row = Record<string, unknown>> {
  eq: QuantifiedComparableFilterOperator<Row>;
  neq: ComparableFilterOperator<Row>;
  gt: QuantifiedComparableFilterOperator<Row>;
  gte: QuantifiedComparableFilterOperator<Row>;
  lt: QuantifiedComparableFilterOperator<Row>;
  lte: QuantifiedComparableFilterOperator<Row>;
  in: InFilterOperator<Row>;
  is: IsFilterOperator<Row>;
  isDistinct: FieldValueFilterOperator<Row>;
  like: PatternFilterOperator<Row>;
  ilike: PatternFilterOperator<Row>;
  match: PatternFilterOperator<Row>;
  imatch: PatternFilterOperator<Row>;
  fts: FullTextFilterOperator<Row>;
  plfts: FullTextFilterOperator<Row>;
  phfts: FullTextFilterOperator<Row>;
  wfts: FullTextFilterOperator<Row>;
  cs: CollectionFilterOperator<Row>;
  cd: CollectionFilterOperator<Row>;
  ov: CollectionFilterOperator<Row>;
  sl: FieldValueFilterOperator<Row>;
  sr: FieldValueFilterOperator<Row>;
  nxr: FieldValueFilterOperator<Row>;
  nxl: FieldValueFilterOperator<Row>;
  adj: FieldValueFilterOperator<Row>;
  and(configure: FilterCallback<Row>): this;
  or(configure: FilterCallback<Row>): this;
  not(configure: FilterCallback<Row>): this;
  raw: RawFilterOperator<Row>;
}

export type FilterCallback<Row = Record<string, unknown>> = (
  filter: FilterBuilder<Row>,
) => void;

interface SelectionBuilder<
  Row,
  Context,
  Depth extends readonly unknown[],
  DirectChildren extends boolean,
> {
  select(fields: readonly Field<Row>[]): this;
  selectAll(): this;
  selectRaw(segment: string): this;
  embedAll(paths: readonly EmbedAllPath<Context, Depth>[]): this;
  embed<
    Target extends Depth extends readonly [] ? never : RelatedTable<Context>,
  >(
    table: Target,
    configure?: EmbedCallback<
      RowFor<Context, Target>,
      ContextFor<Context, Target>,
      Tail<Depth>
    >,
  ): EmbedRef<
    RowFor<Context, Target>,
    RelatedCardinality<Context, Target>,
    Extract<Target, string>,
    DirectChildren,
    ContextFor<Context, Target>,
    Tail<Depth>
  >;
  embed<
    Target extends Depth extends readonly [] ? never : RelatedTable<Context>,
    const Alias extends string = Extract<Target, string>,
  >(
    table: Target,
    options: EmbedOptions<RelatedForeignKey<Context, Target>, Alias>,
    configure?: EmbedCallback<
      RowFor<Context, Target>,
      ContextFor<Context, Target>,
      Tail<Depth>
    >,
  ): EmbedRef<
    RowFor<Context, Target>,
    RelatedCardinality<Context, Target>,
    Alias,
    DirectChildren,
    ContextFor<Context, Target>,
    Tail<Depth>
  >;
}

interface OrderingBuilder<Row> {
  orderBy<Key extends Field<Row>>(field: Key, options?: OrderOptions): this;
  orderByRaw(value: string): this;
}

export interface EmbedBuilder<
  Row = Record<string, unknown>,
  Context = never,
  Depth extends readonly unknown[] = DefaultDepth,
>
  extends SelectionBuilder<Row, Context, Depth, false>, OrderingBuilder<Row> {
  where(configure: FilterCallback<Row>): this;
}

export type EmbedCallback<
  Row = Record<string, unknown>,
  Context = never,
  Depth extends readonly unknown[] = DefaultDepth,
> = (embed: EmbedBuilder<Row, Context, Depth>) => void;

export interface QueryBuilder<
  Row = Record<string, unknown>,
  Context = never,
  Depth extends readonly unknown[] = DefaultDepth,
> extends SelectionBuilder<Row, Context, Depth, true> {
  where(configure: FilterCallback<Row>): this;
  orderBy<Key extends Field<Row>>(field: Key, options?: OrderOptions): this;
  orderBy<RelatedRow, Alias extends string>(
    embed: EmbedReference<RelatedRow, 'one', Alias, true>,
    field: Field<RelatedRow>,
    options?: OrderOptions,
  ): this;
  orderByRaw(value: string): this;
  page(options: PageOptions): this;
}

export interface FindRecordBuilder<
  Row = Record<string, unknown>,
  Context = never,
  Depth extends readonly unknown[] = DefaultDepth,
> extends SelectionBuilder<Row, Context, Depth, true> {}

export type QueryCallback<Row = Record<string, unknown>, Context = never> = (
  query: QueryBuilder<Row, Context>,
) => void;

export type FindRecordCallback<
  Row = Record<string, unknown>,
  Context = never,
> = (record: FindRecordBuilder<Row, Context>) => void;

interface SelectNode {
  fields: string[];
  all: boolean;
  entries: SelectionEntry[];
  embeds: EmbedNode[];
}

type SelectionEntry =
  | { kind: 'segment'; value: string }
  | { kind: 'embed'; node: EmbedNode };

interface EmbedNode extends SelectNode {
  table: string;
  alias: string;
  using?: string;
  join: 'left' | 'inner';
  path: string;
  filters: FilterNode[];
  orders: OrderNode[];
}

type FilterNode =
  | {
      kind: 'predicate';
      field: string;
      operator: string;
      value: unknown;
      quantifier?: 'any' | 'all';
      config?: string;
    }
  | { kind: 'group'; operator: 'and' | 'or' | 'not'; terms: FilterNode[] }
  | { kind: 'raw'; field: string; value: string };

type OrderNode =
  | { kind: 'field'; field: string; options?: OrderOptions }
  | {
      kind: 'related';
      alias: string;
      field: string;
      options?: OrderOptions;
    }
  | { kind: 'raw'; value: string };

export interface FluentQueryState {
  select: SelectNode;
  filters: FilterNode[];
  orders: OrderNode[];
  page?: PageOptions;
}

interface RuntimeEmbedRef {
  owner: object;
  node: EmbedNode;
  direct: boolean;
}

const EMBED_REFERENCES = new WeakMap<object, RuntimeEmbedRef>();

function createSelectNode(): SelectNode {
  return { fields: [], all: false, entries: [], embeds: [] };
}

function selectAll(node: SelectNode): void {
  if (node.fields.length) {
    throw new TypeError('selectAll() cannot be combined with named fields.');
  }
  if (!node.all) {
    node.all = true;
    node.entries.push({ kind: 'segment', value: '*' });
  }
}

abstract class SelectionBuilderImpl {
  constructor(
    protected readonly selection: SelectNode,
    protected readonly owner: object,
    protected readonly directChildren: boolean,
    protected readonly parentPath: string,
  ) {}

  select(fields: readonly string[]): this {
    if (!Array.isArray(fields) || fields.length === 0) {
      throw new RangeError('select() requires at least one field.');
    }
    if (this.selection.all) {
      throw new TypeError('select() cannot be combined with selectAll().');
    }
    for (const field of fields) {
      assertNonEmptyString(field, 'select field');
      if (!this.selection.fields.includes(field)) {
        this.selection.fields.push(field);
      }
      if (!hasSelectionSegment(this.selection, field)) {
        this.selection.entries.push({ kind: 'segment', value: field });
      }
    }
    return this;
  }

  selectAll(): this {
    selectAll(this.selection);
    return this;
  }

  selectRaw(segment: string): this {
    assertNonEmptyString(segment, 'raw select segment');
    if (!hasSelectionSegment(this.selection, segment)) {
      this.selection.entries.push({ kind: 'segment', value: segment });
    }
    return this;
  }

  embedAll(paths: readonly string[]): this {
    if (!Array.isArray(paths) || paths.length === 0) {
      throw new RangeError(
        'embedAll() requires at least one relationship path.',
      );
    }

    for (const relationshipPath of paths) {
      assertNonEmptyString(relationshipPath, 'embedAll relationship path');
      const tables = relationshipPath.split('.');
      if (tables.some((table) => table.length === 0)) {
        throw new RangeError(
          'embedAll relationship paths must not contain empty segments.',
        );
      }

      let selection = this.selection;
      let parentPath = this.parentPath;
      for (const table of tables) {
        let node = selection.embeds.find(
          (embed) => embed.table === table && embed.alias === table,
        );
        if (!node) {
          node = this.createEmbedNode(selection, parentPath, table, {});
        }
        selectAll(node);
        selection = node;
        parentPath = node.path;
      }
    }
    return this;
  }

  embed(
    table: string,
    optionsOrConfigure:
      | EmbedOptions
      | ((embed: EmbedBuilder<Record<string, unknown>>) => void) = {},
    configure?: (embed: EmbedBuilder<Record<string, unknown>>) => void,
  ): EmbedRef {
    const options =
      typeof optionsOrConfigure === 'function' ? {} : optionsOrConfigure;
    const callback =
      typeof optionsOrConfigure === 'function' ? optionsOrConfigure : configure;
    assertNonEmptyString(table, 'embedded table');
    const alias = options.as ?? table;
    assertNonEmptyString(alias, 'embed alias');
    if (options.using !== undefined) {
      assertNonEmptyString(options.using, 'embed foreign key');
    }
    if (
      options.join !== undefined &&
      options.join !== 'left' &&
      options.join !== 'inner'
    ) {
      throw new RangeError('embed join must be left or inner.');
    }
    if (this.selection.embeds.some((embed) => embed.alias === alias)) {
      throw new RangeError(`embed alias ${alias} is already in use.`);
    }

    const node = this.createEmbedNode(
      this.selection,
      this.parentPath,
      table,
      options,
    );
    const builder = new EmbedBuilderImpl(
      node,
      this.owner,
      node.path,
      this.directChildren,
    );
    runSynchronousCallback(
      callback as ((embed: unknown) => void) | undefined,
      builder,
      'embed',
    );
    return builder as unknown as EmbedRef;
  }

  private createEmbedNode(
    selection: SelectNode,
    parentPath: string,
    table: string,
    options: EmbedOptions,
  ): EmbedNode {
    const alias = options.as ?? table;
    assertNonEmptyString(alias, 'embed alias');
    if (selection.embeds.some((embed) => embed.alias === alias)) {
      throw new RangeError(`embed alias ${alias} is already in use.`);
    }
    const path = parentPath ? `${parentPath}.${alias}` : alias;
    const node: EmbedNode = {
      ...createSelectNode(),
      table,
      alias,
      ...(options.using ? { using: options.using } : {}),
      join: options.join ?? 'left',
      path,
      filters: [],
      orders: [],
    };
    FILTER_CONTEXTS.set(node.filters, { owner: this.owner, scope: path });
    selection.embeds.push(node);
    selection.entries.push({ kind: 'embed', node });
    return node;
  }
}

class EmbedBuilderImpl extends SelectionBuilderImpl {
  constructor(
    private readonly node: EmbedNode,
    owner: object,
    path: string,
    direct: boolean,
  ) {
    super(node, owner, false, path);
    EMBED_REFERENCES.set(this, { owner, node, direct });
  }

  where(configure: FilterCallback<Record<string, unknown>>): this {
    appendFilterGroup(this.node.filters, configure, '', 'where');
    return this;
  }

  orderBy(field: string, options?: OrderOptions): this {
    assertNonEmptyString(field, 'order field');
    assertOrderOptions(options);
    this.node.orders.push({
      kind: 'field',
      field,
      ...(options ? { options } : {}),
    });
    return this;
  }

  orderByRaw(value: string): this {
    assertNonEmptyString(value, 'raw order clause');
    this.node.orders.push({ kind: 'raw', value });
    return this;
  }
}

class FindRecordBuilderImpl extends SelectionBuilderImpl {}

class QueryBuilderImpl extends SelectionBuilderImpl {
  constructor(
    private readonly state: FluentQueryState,
    owner: object,
  ) {
    super(state.select, owner, true, '');
  }

  where(configure: FilterCallback<Record<string, unknown>>): this {
    appendFilterGroup(this.state.filters, configure, '', 'where');
    return this;
  }

  orderBy(
    fieldOrEmbed: string | EmbedReference,
    fieldOrOptions?: string | OrderOptions,
    relatedOptions?: OrderOptions,
  ): this {
    if (typeof fieldOrEmbed === 'string') {
      assertNonEmptyString(fieldOrEmbed, 'order field');
      const options = fieldOrOptions as OrderOptions | undefined;
      assertOrderOptions(options);
      this.state.orders.push({
        kind: 'field',
        field: fieldOrEmbed,
        ...(options ? { options } : {}),
      });
      return this;
    }

    const reference = assertEmbedReference(fieldOrEmbed, this.owner);
    if (!reference.direct) {
      throw new TypeError(
        'Parent ordering requires an embed declared directly on this query.',
      );
    }
    const field = fieldOrOptions;
    assertNonEmptyString(field, 'related order field');
    assertOrderOptions(relatedOptions);
    this.state.orders.push({
      kind: 'related',
      alias: reference.node.alias,
      field,
      ...(relatedOptions ? { options: relatedOptions } : {}),
    });
    return this;
  }

  orderByRaw(value: string): this {
    assertNonEmptyString(value, 'raw order clause');
    this.state.orders.push({ kind: 'raw', value });
    return this;
  }

  page(options: PageOptions): this {
    assertPageOptions(options);
    this.state.page = { ...options };
    return this;
  }
}

class FilterBuilderImpl {
  constructor(
    private readonly terms: FilterNode[],
    private readonly owner: object,
    private readonly scope: string,
    private readonly prefix: string,
  ) {}

  private add(
    operator: string,
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    valueOrOptions?: unknown,
    relatedOptions?: QuantifierOptions | FullTextOptions,
  ): this {
    const { field, value, options, prefix } = this.resolveArguments(
      fieldOrEmbed,
      fieldOrValue,
      valueOrOptions,
      relatedOptions,
    );
    assertNonEmptyString(field, 'filter field');
    if (value === undefined) {
      throw new TypeError('filter operands must not be undefined.');
    }
    const quantifier =
      options && 'quantifier' in options ? options.quantifier : undefined;
    const config = options && 'config' in options ? options.config : undefined;
    if (quantifier !== undefined) {
      if (quantifier !== 'any' && quantifier !== 'all') {
        throw new RangeError('filter quantifier must be any or all.');
      }
      assertNonEmptyArray(value, `${operator} ${quantifier}`);
    }
    if (operator === 'in') {
      assertNonEmptyArray(value, 'in');
    }
    if (config !== undefined) {
      validateFullTextConfig(config);
    }
    if (
      (operator === 'fts' ||
        operator === 'plfts' ||
        operator === 'phfts' ||
        operator === 'wfts') &&
      (typeof value !== 'string' || value.length === 0)
    ) {
      throw new RangeError('full-text queries must be non-empty strings.');
    }
    this.terms.push({
      kind: 'predicate',
      field: prefix ? `${prefix}.${field}` : field,
      operator,
      value,
      ...(quantifier ? { quantifier } : {}),
      ...(config !== undefined ? { config } : {}),
    });
    return this;
  }

  private resolveArguments(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    valueOrOptions?: unknown,
    relatedOptions?: QuantifierOptions | FullTextOptions,
  ): {
    field: unknown;
    value: unknown;
    options?: QuantifierOptions | FullTextOptions;
    prefix: string;
  } {
    if (typeof fieldOrEmbed === 'string') {
      return {
        field: fieldOrEmbed,
        value: fieldOrValue,
        ...(valueOrOptions !== undefined
          ? {
              options: valueOrOptions as QuantifierOptions | FullTextOptions,
            }
          : {}),
        prefix: this.prefix,
      };
    }

    const reference = assertEmbedReference(fieldOrEmbed, this.owner);
    const relatedPrefix =
      this.scope && reference.node.path.startsWith(`${this.scope}.`)
        ? reference.node.path.slice(this.scope.length + 1)
        : reference.node.path;
    return {
      field: fieldOrValue,
      value: valueOrOptions,
      ...(relatedOptions !== undefined ? { options: relatedOptions } : {}),
      prefix: this.prefix ? `${this.prefix}.${relatedPrefix}` : relatedPrefix,
    };
  }

  eq(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    valueOrOptions?: unknown,
    relatedOptions?: QuantifierOptions,
  ): this {
    return this.add(
      'eq',
      fieldOrEmbed,
      fieldOrValue,
      valueOrOptions,
      relatedOptions,
    );
  }
  neq(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    value?: unknown,
  ): this {
    return this.add('neq', fieldOrEmbed, fieldOrValue, value);
  }
  gt(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    valueOrOptions?: unknown,
    relatedOptions?: QuantifierOptions,
  ): this {
    return this.add(
      'gt',
      fieldOrEmbed,
      fieldOrValue,
      valueOrOptions,
      relatedOptions,
    );
  }
  gte(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    valueOrOptions?: unknown,
    relatedOptions?: QuantifierOptions,
  ): this {
    return this.add(
      'gte',
      fieldOrEmbed,
      fieldOrValue,
      valueOrOptions,
      relatedOptions,
    );
  }
  lt(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    valueOrOptions?: unknown,
    relatedOptions?: QuantifierOptions,
  ): this {
    return this.add(
      'lt',
      fieldOrEmbed,
      fieldOrValue,
      valueOrOptions,
      relatedOptions,
    );
  }
  lte(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    valueOrOptions?: unknown,
    relatedOptions?: QuantifierOptions,
  ): this {
    return this.add(
      'lte',
      fieldOrEmbed,
      fieldOrValue,
      valueOrOptions,
      relatedOptions,
    );
  }
  in(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    value?: unknown,
  ): this {
    return this.add('in', fieldOrEmbed, fieldOrValue, value);
  }
  is(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    value?: unknown,
  ): this {
    return this.add('is', fieldOrEmbed, fieldOrValue, value);
  }
  isDistinct(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    value?: unknown,
  ): this {
    return this.add('isdistinct', fieldOrEmbed, fieldOrValue, value);
  }
  like(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    valueOrOptions?: unknown,
    relatedOptions?: QuantifierOptions,
  ): this {
    return this.add(
      'like',
      fieldOrEmbed,
      fieldOrValue,
      valueOrOptions,
      relatedOptions,
    );
  }
  ilike(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    valueOrOptions?: unknown,
    relatedOptions?: QuantifierOptions,
  ): this {
    return this.add(
      'ilike',
      fieldOrEmbed,
      fieldOrValue,
      valueOrOptions,
      relatedOptions,
    );
  }
  match(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    valueOrOptions?: unknown,
    relatedOptions?: QuantifierOptions,
  ): this {
    return this.add(
      'match',
      fieldOrEmbed,
      fieldOrValue,
      valueOrOptions,
      relatedOptions,
    );
  }
  imatch(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    valueOrOptions?: unknown,
    relatedOptions?: QuantifierOptions,
  ): this {
    return this.add(
      'imatch',
      fieldOrEmbed,
      fieldOrValue,
      valueOrOptions,
      relatedOptions,
    );
  }
  fts(
    fieldOrEmbed: string | EmbedReference,
    fieldOrQuery: string,
    queryOrOptions?: string | FullTextOptions,
    relatedOptions?: FullTextOptions,
  ): this {
    return this.add(
      'fts',
      fieldOrEmbed,
      fieldOrQuery,
      queryOrOptions,
      relatedOptions,
    );
  }
  plfts(
    fieldOrEmbed: string | EmbedReference,
    fieldOrQuery: string,
    queryOrOptions?: string | FullTextOptions,
    relatedOptions?: FullTextOptions,
  ): this {
    return this.add(
      'plfts',
      fieldOrEmbed,
      fieldOrQuery,
      queryOrOptions,
      relatedOptions,
    );
  }
  phfts(
    fieldOrEmbed: string | EmbedReference,
    fieldOrQuery: string,
    queryOrOptions?: string | FullTextOptions,
    relatedOptions?: FullTextOptions,
  ): this {
    return this.add(
      'phfts',
      fieldOrEmbed,
      fieldOrQuery,
      queryOrOptions,
      relatedOptions,
    );
  }
  wfts(
    fieldOrEmbed: string | EmbedReference,
    fieldOrQuery: string,
    queryOrOptions?: string | FullTextOptions,
    relatedOptions?: FullTextOptions,
  ): this {
    return this.add(
      'wfts',
      fieldOrEmbed,
      fieldOrQuery,
      queryOrOptions,
      relatedOptions,
    );
  }
  cs(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    value?: unknown,
  ): this {
    return this.add('cs', fieldOrEmbed, fieldOrValue, value);
  }
  cd(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    value?: unknown,
  ): this {
    return this.add('cd', fieldOrEmbed, fieldOrValue, value);
  }
  ov(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    value?: unknown,
  ): this {
    return this.add('ov', fieldOrEmbed, fieldOrValue, value);
  }
  sl(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    value?: unknown,
  ): this {
    return this.add('sl', fieldOrEmbed, fieldOrValue, value);
  }
  sr(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    value?: unknown,
  ): this {
    return this.add('sr', fieldOrEmbed, fieldOrValue, value);
  }
  nxr(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    value?: unknown,
  ): this {
    return this.add('nxr', fieldOrEmbed, fieldOrValue, value);
  }
  nxl(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    value?: unknown,
  ): this {
    return this.add('nxl', fieldOrEmbed, fieldOrValue, value);
  }
  adj(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: unknown,
    value?: unknown,
  ): this {
    return this.add('adj', fieldOrEmbed, fieldOrValue, value);
  }

  and(configure: FilterCallback<Record<string, unknown>>): this {
    return this.group('and', configure);
  }
  or(configure: FilterCallback<Record<string, unknown>>): this {
    return this.group('or', configure);
  }
  not(configure: FilterCallback<Record<string, unknown>>): this {
    return this.group('not', configure);
  }

  private group(
    operator: 'and' | 'or' | 'not',
    configure: FilterCallback<Record<string, unknown>>,
  ): this {
    const terms: FilterNode[] = [];
    const builder = new FilterBuilderImpl(
      terms,
      this.owner,
      this.scope,
      this.prefix,
    );
    runSynchronousCallback(
      configure as (filter: unknown) => void,
      builder,
      `${operator} filter`,
    );
    if (!terms.length) {
      throw new RangeError(`${operator} filter must contain a predicate.`);
    }
    this.terms.push({ kind: 'group', operator, terms });
    return this;
  }

  raw(
    fieldOrEmbed: string | EmbedReference,
    fieldOrValue: string,
    relatedValue?: string,
  ): this {
    const { field, value, prefix } = this.resolveArguments(
      fieldOrEmbed,
      fieldOrValue,
      relatedValue,
    );
    assertNonEmptyString(field, 'raw filter field');
    assertNonEmptyString(value, 'raw filter value');
    this.terms.push({
      kind: 'raw',
      field: prefix ? `${prefix}.${field}` : field,
      value,
    });
    return this;
  }
}

function appendFilterGroup(
  destination: FilterNode[],
  configure: FilterCallback<Record<string, unknown>>,
  prefix: string,
  name: string,
): void {
  const terms: FilterNode[] = [];
  const context = filterContextFor(destination);
  const builder = new FilterBuilderImpl(
    terms,
    context.owner,
    context.scope,
    prefix,
  );
  runSynchronousCallback(configure as (filter: unknown) => void, builder, name);
  if (!terms.length) {
    throw new RangeError(`${name} must contain a predicate.`);
  }
  destination.push(...terms);
}

const FILTER_CONTEXTS = new WeakMap<object, { owner: object; scope: string }>();
function filterContextFor(destination: FilterNode[]): {
  owner: object;
  scope: string;
} {
  let context = FILTER_CONTEXTS.get(destination);
  if (!context) {
    context = { owner: {}, scope: '' };
    FILTER_CONTEXTS.set(destination, context);
  }
  return context;
}

export function createFluentQuery(
  configure?: (query: unknown) => void,
): FluentQueryState {
  const state: FluentQueryState = {
    select: createSelectNode(),
    filters: [],
    orders: [],
  };
  const owner = {};
  FILTER_CONTEXTS.set(state.filters, { owner, scope: '' });
  const builder = new QueryBuilderImpl(state, owner);
  runSynchronousCallback(configure, builder, 'query');
  return state;
}

export function createFluentFindRecord(
  configure?: (record: unknown) => void,
): SelectNode {
  const select = createSelectNode();
  const owner = {};
  const builder = new FindRecordBuilderImpl(select, owner, true, '');
  runSynchronousCallback(configure, builder, 'findRecord');
  return select;
}

export function appendFluentSelection(
  select: SelectNode,
  searchParams: URLSearchParams,
): void {
  searchParams.append('select', serializeSelect(select, true));
  for (const embed of allEmbeds(select)) {
    appendScopedFilters(embed, searchParams);
    const order = serializeOrders(embed.orders);
    if (order) {
      searchParams.append(`${embed.path}.order`, order);
    }
  }
}

export function appendFluentQuery(
  state: FluentQueryState,
  searchParams: URLSearchParams,
): void {
  appendFluentSelection(state.select, searchParams);
  appendFilterNodes(state.filters, searchParams);
  const order = serializeOrders(state.orders);
  if (order) {
    searchParams.append('order', order);
  }
}

function serializeSelect(node: SelectNode, root: boolean): string {
  if (root && node.entries.length === 0) {
    return '*';
  }
  return node.entries
    .map((entry) => {
      if (entry.kind === 'segment') {
        return entry.value;
      }
      const embed = entry.node;
      const target = [
        embed.alias === embed.table
          ? embed.table
          : `${embed.alias}:${embed.table}`,
        embed.using ? `!${embed.using}` : '',
        embed.join === 'inner' ? '!inner' : '',
      ].join('');
      return `${target}(${serializeSelect(embed, false)})`;
    })
    .join(',');
}

function hasSelectionSegment(node: SelectNode, value: string): boolean {
  return node.entries.some(
    (entry) => entry.kind === 'segment' && entry.value === value,
  );
}

function* allEmbeds(node: SelectNode): Generator<EmbedNode> {
  for (const embed of node.embeds) {
    yield embed;
    yield* allEmbeds(embed);
  }
}

function appendScopedFilters(
  embed: EmbedNode,
  searchParams: URLSearchParams,
): void {
  for (const node of embed.filters) {
    appendRootFilter(node, searchParams, embed.path);
  }
}

function appendFilterNodes(
  nodes: FilterNode[],
  searchParams: URLSearchParams,
): void {
  for (const node of nodes) {
    appendRootFilter(node, searchParams, '');
  }
}

function appendRootFilter(
  node: FilterNode,
  searchParams: URLSearchParams,
  scope: string,
): void {
  const prefix = scope ? `${scope}.` : '';
  if (node.kind === 'predicate') {
    searchParams.append(`${prefix}${node.field}`, serializePredicate(node));
  } else if (node.kind === 'raw') {
    searchParams.append(`${prefix}${node.field}`, node.value);
  } else {
    const key = node.operator === 'not' ? 'not.and' : node.operator;
    searchParams.append(
      `${prefix}${key}`,
      `(${node.terms.map(serializeFilterTerm).join(',')})`,
    );
  }
}

function serializeFilterTerm(node: FilterNode): string {
  if (node.kind === 'predicate') {
    return `${node.field}.${serializePredicate(node)}`;
  }
  if (node.kind === 'raw') {
    return `${node.field}.${node.value}`;
  }
  const operator = node.operator === 'not' ? 'not.and' : node.operator;
  return `${operator}(${node.terms.map(serializeFilterTerm).join(',')})`;
}

function serializePredicate(
  node: Extract<FilterNode, { kind: 'predicate' }>,
): string {
  const operator = node.config
    ? `${node.operator}(${validateFullTextConfig(node.config)})`
    : node.quantifier
      ? `${node.operator}(${node.quantifier})`
      : node.operator;
  if (node.operator === 'in') {
    return `${operator}.${serializeList(node.value, '(', ')')}`;
  }
  if (node.quantifier) {
    return `${operator}.${serializeList(node.value, '{', '}')}`;
  }
  if (node.operator === 'is') {
    return `${operator}.${serializeIsValue(node.value)}`;
  }
  if (
    node.operator === 'cs' ||
    node.operator === 'cd' ||
    node.operator === 'ov'
  ) {
    return `${operator}.${serializeCollectionValue(node.value)}`;
  }
  return `${operator}.${serializeValue(node.value)}`;
}

function serializeOrders(orders: OrderNode[]): string {
  return [
    ...new Set(
      orders.map((order) => {
        if (order.kind === 'raw') {
          return order.value;
        }
        const field =
          order.kind === 'related'
            ? `${order.alias}(${order.field})`
            : order.field;
        return [
          field,
          order.options?.direction,
          order.options?.nulls ? `nulls${order.options.nulls}` : undefined,
        ]
          .filter((part): part is string => Boolean(part))
          .join('.');
      }),
    ),
  ].join(',');
}

function serializeList(value: unknown, open: string, close: string): string {
  assertNonEmptyArray(value, 'filter list');
  return `${open}${value.map(serializeValue).join(',')}${close}`;
}

function serializeCollectionValue(value: unknown): string {
  return Array.isArray(value)
    ? `{${value.map(serializeValue).join(',')}}`
    : serializeValue(value);
}

function serializeIsValue(value: unknown): string {
  if (
    value === null ||
    typeof value === 'boolean' ||
    value === 'unknown' ||
    value === 'not_null'
  ) {
    return String(value);
  }
  throw new TypeError('is() received an invalid value.');
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
    if (serialized !== undefined) {
      return quotePostgrestValue(serialized);
    }
  }
  throw new TypeError('PostgREST filter values must be serializable.');
}

function quotePostgrestValue(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function validateFullTextConfig(config: string): string {
  if (!config || /[(),]/.test(config)) {
    throw new TypeError('full-text configuration is not valid.');
  }
  return config;
}

function assertEmbedReference(
  embed: EmbedReference<any>,
  owner: object,
): RuntimeEmbedRef {
  if (typeof embed !== 'object' || embed === null) {
    throw new TypeError('expected an embed reference.');
  }
  const reference = EMBED_REFERENCES.get(embed as unknown as object);
  if (!reference || reference.owner !== owner) {
    throw new TypeError('embed reference belongs to another query.');
  }
  return reference;
}

function assertOrderOptions(options: OrderOptions | undefined): void {
  if (!options) {
    return;
  }
  if (
    options.direction !== undefined &&
    options.direction !== 'asc' &&
    options.direction !== 'desc'
  ) {
    throw new RangeError('order direction must be asc or desc.');
  }
  if (
    options.nulls !== undefined &&
    options.nulls !== 'first' &&
    options.nulls !== 'last'
  ) {
    throw new RangeError('order nulls must be first or last.');
  }
}

function assertPageOptions(options: PageOptions): void {
  const { size, number = 1, count = 'exact' } = options;
  assertPositiveSafeInteger(size, 'page.size');
  assertPositiveSafeInteger(number, 'page.number');
  if (count !== 'exact' && count !== 'planned' && count !== 'estimated') {
    throw new RangeError('page.count must be exact, planned, or estimated.');
  }
  if (!Number.isSafeInteger((number - 1) * size)) {
    throw new RangeError(
      'page.number and page.size produce an unsafe PostgREST offset.',
    );
  }
}

function assertPositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive safe integer.`);
  }
}

function assertNonEmptyArray(
  value: unknown,
  name: string,
): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError(`${name} requires at least one value.`);
  }
}

function assertNonEmptyString(
  value: unknown,
  name: string,
): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new RangeError(`${name} must be a non-empty string.`);
  }
}

function runSynchronousCallback<Value>(
  callback: ((value: Value) => void) | undefined,
  value: Value,
  name: string,
): void {
  if (!callback) {
    return;
  }
  const result = (callback as (value: Value) => unknown)(value);
  if (
    typeof result === 'object' &&
    result !== null &&
    'then' in result &&
    typeof result.then === 'function'
  ) {
    throw new TypeError(`${name} callback must be synchronous.`);
  }
}

export function paginationFromState(state: FluentQueryState):
  | {
      limit: number;
      offset: number;
      count: PostgrestCountMode;
    }
  | undefined {
  if (!state.page) {
    return undefined;
  }
  const number = state.page.number ?? 1;
  return {
    limit: state.page.size,
    offset: (number - 1) * state.page.size,
    count: state.page.count ?? 'exact',
  };
}
