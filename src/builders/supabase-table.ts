/**
 * Attaches generated Supabase table metadata to a Warp Drive resource type.
 *
 * This property is type-only and does not need to exist on resource instances.
 */
export const SupabaseTable: unique symbol = Symbol(
  'warp-drive-supabase.supabase-table',
);

type ValueAt<T, K extends PropertyKey> = K extends keyof T ? T[K] : never;

type SupabaseDefinition<T> = ValueAt<T, typeof SupabaseTable>;

export type SupabaseRow<T> = [SupabaseDefinition<T>] extends [never]
  ? never
  : NonNullable<SupabaseDefinition<T>> extends { Row: infer Row }
    ? Row
    : never;
