import { underscore } from '@ember/string';
import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core/types/record';
import type { QueryRequestOptions as BaseQueryRequestOptions } from '@warp-drive/core/types/request';
import type { CollectionResourceDataDocument } from '@warp-drive/core/types/spec/document';

import { buildBaseURL, buildQueryParams, type QueryUrlOptions } from '@warp-drive/utilities';
import { pluralize } from '@warp-drive/utilities/string';

import { serializePostgrestSelect, serializePostgrestOrder } from './utils/query-params';

import type { Includes } from '@warp-drive/core-types/record';

type Direction = 'asc' | 'desc';
type Nulls = 'nullsfirst' | 'nullslast';

// Accept any string BEFORE the dot, but only certain suffixes
type OrderString =
  | `${string}.${Direction}`
  | `${string}.${Nulls}`
  | `${string}.${Direction}.${Nulls}`;

type Filters = Record<string, string | Array<string>>;

interface QueryOptions<T = unknown> {
  include?: T extends TypedRecordInstance ? Includes<T>[] : string | string[];
  order?: OrderString[]; // TODO: can we make this more type-safe to enforce the given schema's fields?
  filter?: Filters;
};

type QueryRequestOptions<RT = unknown, T = unknown> = BaseQueryRequestOptions<RT, T> & {
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
    resourcePath: pluralize(underscore(type)),
  };

  const headers = new Headers();
  headers.append('Accept', 'application/json;charset=utf-8');

  const url = buildBaseURL(urlOptions);

  const queryParams = new URLSearchParams();

  queryParams.append('select', serializePostgrestSelect(options.include));
  queryParams.append('order', serializePostgrestOrder(options.order));
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
