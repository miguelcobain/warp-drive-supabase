import type { TypedRecordInstance, TypeFromInstance, Includes } from '@warp-drive/core/types/record';
import type { QueryRequestOptions as BaseQueryRequestOptions } from '@warp-drive/core/types/request';
import type { CollectionResourceDataDocument } from '@warp-drive/core/types/spec/document';

import { serializePostgrestSelect, serializePostgrestOrder } from './utils/query-params';
import { pluralizeType, underscore } from '../utils/string';
import { buildBaseURL, buildQueryParams, type QueryUrlOptions } from '../utils/url';

type Direction = 'asc' | 'desc';
type Nulls = 'nullsfirst' | 'nullslast';

type OrderSuffix =
  | `${Direction}`
  | `${Nulls}`
  | `${Direction}.${Nulls}`;

type UntypedOrderString =
  | `${string}.${Direction}`
  | `${string}.${Nulls}`
  | `${string}.${Direction}.${Nulls}`;

type Filters = Record<string, string | Array<string>>;

type ScalarFieldValue = string | number | boolean | bigint | null | undefined;

type SnakeCase<S extends string> =
  S extends `${infer Head}${infer Tail}`
    ? Tail extends Uncapitalize<Tail>
      ? `${Lowercase<Head>}${SnakeCase<Tail>}`
      : `${Lowercase<Head>}_${SnakeCase<Tail>}`
    : S;

type QueryableFieldKey<T extends TypedRecordInstance> = Exclude<
  {
    [K in Extract<keyof T, string>]:
      NonNullable<T[K]> extends ScalarFieldValue ? K : never;
  }[Extract<keyof T, string>],
  '$type'
>;

type QueryableFieldName<T extends TypedRecordInstance> =
  | QueryableFieldKey<T>
  | SnakeCase<QueryableFieldKey<T>>;

type TypedOrderString<T extends TypedRecordInstance> =
  `${QueryableFieldName<T>}.${OrderSuffix}`;

interface QueryOptions<T = unknown> {
  include?: T extends TypedRecordInstance ? Includes<T> | Includes<T>[] : string | string[];
  order?: T extends TypedRecordInstance ? TypedOrderString<T>[] : UntypedOrderString[];
  fields?: T extends TypedRecordInstance ? QueryableFieldName<T>[] : string[];
  filter?: Filters;
}

type QueryRequestOptions<RT = unknown> = BaseQueryRequestOptions<RT> & {
  options?: Record<string, unknown>;
};

export function query<T extends TypedRecordInstance>(
  type: TypeFromInstance<T>,
  options?: QueryOptions<T>
): QueryRequestOptions<CollectionResourceDataDocument<T>>;

export function query(
  type: string,
  options?: QueryOptions
): QueryRequestOptions;

export function query(
  type: string,
  options: QueryOptions = {}
): QueryRequestOptions {
  const urlOptions: QueryUrlOptions = {
    identifier: { type },
    op: 'query',
    resourcePath: pluralizeType(underscore(type)),
  };

  const headers = new Headers();
  headers.append('Accept', 'application/json;charset=utf-8');

  const url = buildBaseURL(urlOptions);

  const queryParams = new URLSearchParams();

  const select = serializePostgrestSelect(options.include, options.fields);

  queryParams.append('select', select);
  if (options.order) {
    queryParams.append('order', serializePostgrestOrder(options.order));
  }
  appendQueryParams(options.filter, queryParams);

  const queryString = buildQueryParams(queryParams);

  return {
    url: queryString ? `${url}?${queryString}` : url,
    method: 'GET',
    headers,
    op: 'query',
    options: {
      type: type
    }
  };
}

function appendQueryParams(params: Filters = {}, searchParams: URLSearchParams) {
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        searchParams.append(key, String(v));
      }
    } else {
      searchParams.append(key, String(value));
    }
  }
}
