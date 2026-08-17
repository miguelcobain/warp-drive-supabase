/**
 * Attaches generated Supabase table metadata to a Warp Drive resource type.
 *
 * This property is type-only and does not need to exist on resource instances.
 */
export const SupabaseTable: unique symbol = Symbol(
  'warp-drive-supabase.supabase-table',
);
