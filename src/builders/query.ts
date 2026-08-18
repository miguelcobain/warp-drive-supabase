import type {
  TypedRecordInstance,
  TypeFromInstance,
} from '@warp-drive/core/types/record';
import type {
  ConstrainedRequestOptions,
  QueryRequestOptions as BaseQueryRequestOptions,
} from '@warp-drive/core/types/request';
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';

import {
  appendFluentQuery,
  createFluentQuery,
  paginationFromState,
  type EmbedBuilder,
  type EmbedCallback,
  type EmbedOptions,
  type EmbedRef,
  type FilterBuilder,
  type FilterCallback,
  type FullTextOptions,
  type OrderDirection,
  type OrderNulls,
  type OrderOptions,
  type QuantifierOptions,
  type QueryBuilder,
  type QueryCallback,
  type RelationshipCardinality,
  type ViewEmbedOptions,
} from './utils/fluent-query';
import type { SupabaseContext, SupabaseRow } from './supabase-table';
import { pluralizeType, underscore } from '../utils/string';
import { buildQueryParams } from '../utils/url';
import { buildPostgrestBaseURL } from './utils/url-options';
import type {
  PageOptions,
  PostgrestCountMode,
  PostgrestPaginationRequestOptions,
} from '../pagination';

export interface QueryOptions extends ConstrainedRequestOptions {}

type QueryRequestOptions<RT = unknown> = BaseQueryRequestOptions<RT> & {
  options?: Record<string, unknown>;
};

type QueryBuilderFor<T> = [SupabaseContext<T>] extends [never]
  ? QueryBuilder<Record<string, unknown>, never>
  : QueryBuilder<SupabaseRow<T>, SupabaseContext<T>>;

export type QueryCallbackFor<T> = (query: QueryBuilderFor<T>) => void;

export function query<T extends TypedRecordInstance>(
  type: TypeFromInstance<T>,
  configure?: QueryCallbackFor<T>,
  options?: QueryOptions,
): QueryRequestOptions<ReactiveDataDocument<T[]>>;

export function query(
  type: string,
  configure?: QueryCallback,
  options?: QueryOptions,
): QueryRequestOptions;

export function query(
  type: string,
  configure?: any,
  options: QueryOptions = {},
): QueryRequestOptions {
  if (configure !== undefined && typeof configure !== 'function') {
    throw new TypeError('query configure must be a function.');
  }

  const headers = new Headers();
  headers.append('Accept', 'application/json;charset=utf-8');

  const url = buildPostgrestBaseURL(
    type,
    pluralizeType(underscore(type)),
    options,
  );
  const state = createFluentQuery(configure);
  const queryParams = new URLSearchParams();
  appendFluentQuery(state, queryParams);

  const fluentPagination = paginationFromState(state);
  let pagination: PostgrestPaginationRequestOptions | undefined;
  if (fluentPagination) {
    queryParams.set('limit', String(fluentPagination.limit));
    queryParams.set('offset', String(fluentPagination.offset));
    headers.append('Prefer', `count=${fluentPagination.count}`);
    pagination = { count: fluentPagination.count };
  }

  const queryString = buildQueryParams(queryParams);

  return {
    url: queryString ? `${url}?${queryString}` : url,
    method: 'GET',
    headers,
    op: 'query',
    options: {
      type,
      ...(pagination ? { postgrestPagination: pagination } : {}),
    },
  };
}

export type {
  EmbedBuilder,
  EmbedCallback,
  EmbedOptions,
  EmbedRef,
  FilterBuilder,
  FilterCallback,
  FullTextOptions,
  OrderDirection,
  OrderNulls,
  OrderOptions,
  PageOptions,
  PostgrestCountMode,
  QuantifierOptions,
  QueryBuilder,
  QueryCallback,
  RelationshipCardinality,
  ViewEmbedOptions,
};
