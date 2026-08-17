/**
 * Attaches generated Supabase table metadata to a Warp Drive resource type.
 *
 * This property is type-only and does not need to exist on resource instances.
 */
export const SupabaseTable: unique symbol = Symbol(
  'warp-drive-supabase.supabase-table',
);

declare const SupabaseTableContext: unique symbol;

type SchemaNames<Database> = Extract<keyof Database, string>;
type TablesFor<
  Database,
  Schema extends SchemaNames<Database>,
> = Database[Schema] extends { Tables: infer Tables } ? Tables : never;

/**
 * Associates a generated Supabase database, schema, and table with a Warp
 * Drive resource. The context is phantom type metadata and has no runtime
 * representation.
 */
export type SupabaseTableDefinition<
  Database,
  Schema extends SchemaNames<Database>,
  Table extends Extract<keyof TablesFor<Database, Schema>, string>,
> = TablesFor<Database, Schema>[Table] & {
  readonly [SupabaseTableContext]: {
    database: Database;
    schema: Schema;
    table: Table;
  };
};

type ValueAt<T, K extends PropertyKey> = K extends keyof T ? T[K] : never;

type SupabaseDefinition<T> = ValueAt<T, typeof SupabaseTable>;

export type SupabaseContext<T> = [NonNullable<SupabaseDefinition<T>>] extends [
  never,
]
  ? never
  : NonNullable<SupabaseDefinition<T>> extends {
        readonly [SupabaseTableContext]: infer Context;
      }
    ? Context
    : never;

export type SupabaseRow<T> = [SupabaseContext<T>] extends [never]
  ? never
  : NonNullable<SupabaseDefinition<T>> extends { Row: infer Row }
    ? Row
    : never;
