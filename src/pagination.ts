export type PostgrestCountMode = 'exact' | 'planned' | 'estimated';

export interface PageOptions {
  size: number;
  number?: number;
  count?: PostgrestCountMode;
}

export interface PostgrestPaginationRequestOptions {
  count: PostgrestCountMode;
}

export const DEFAULT_POSTGREST_COUNT_MODE: PostgrestCountMode = 'exact';

export function isPostgrestCountMode(
  value: unknown,
): value is PostgrestCountMode {
  return value === 'exact' || value === 'planned' || value === 'estimated';
}
