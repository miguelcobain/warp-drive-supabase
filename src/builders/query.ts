import type {
  TypedRecordInstance,
  TypeFromInstance,
  Includes,
} from '@warp-drive/core/types/record';
import type {
  ConstrainedRequestOptions,
  QueryRequestOptions as BaseQueryRequestOptions,
} from '@warp-drive/core/types/request';
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';

import {
  serializePostgrestSelect,
  serializePostgrestOrder,
} from './utils/query-params';
import { pluralizeType, underscore } from '../utils/string';
import { buildQueryParams } from '../utils/url';
import { buildPostgrestBaseURL } from './utils/url-options';
import {
  DEFAULT_POSTGREST_COUNT_MODE,
  isPostgrestCountMode,
  type PageOptions,
  type PostgrestCountMode,
  type PostgrestPaginationRequestOptions,
} from '../pagination';

type Direction = 'asc' | 'desc';
type Nulls = 'nullsfirst' | 'nullslast';

type OrderSuffix = `${Direction}` | `${Nulls}` | `${Direction}.${Nulls}`;

type UntypedOrderString =
  | `${string}.${Direction}`
  | `${string}.${Nulls}`
  | `${string}.${Direction}.${Nulls}`;

type Filters = Record<string, string | Array<string>>;

type ScalarFieldValue = string | number | boolean | bigint | null | undefined;

type SnakeCase<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Tail extends Uncapitalize<Tail>
    ? `${Lowercase<Head>}${SnakeCase<Tail>}`
    : `${Lowercase<Head>}_${SnakeCase<Tail>}`
  : S;

type QueryableFieldKey<T extends TypedRecordInstance> = Exclude<
  {
    [K in Extract<keyof T, string>]: NonNullable<T[K]> extends ScalarFieldValue
      ? K
      : never;
  }[Extract<keyof T, string>],
  '$type'
>;

type QueryableFieldName<T extends TypedRecordInstance> =
  | QueryableFieldKey<T>
  | SnakeCase<QueryableFieldKey<T>>;

type TypedOrderString<T extends TypedRecordInstance> =
  `${QueryableFieldName<T>}.${OrderSuffix}`;

export interface QueryOptions<T = unknown> extends ConstrainedRequestOptions {
  include?: T extends TypedRecordInstance
    ? Includes<T> | Includes<T>[]
    : string | string[];
  order?: T extends TypedRecordInstance
    ? TypedOrderString<T>[]
    : UntypedOrderString[];
  fields?: T extends TypedRecordInstance ? QueryableFieldName<T>[] : string[];
  filter?: Filters;
  page?: PageOptions;
}

type QueryRequestOptions<RT = unknown> = BaseQueryRequestOptions<RT> & {
  options?: Record<string, unknown>;
};

export function query<T extends TypedRecordInstance>(
  type: TypeFromInstance<T>,
  options?: QueryOptions<T>,
): QueryRequestOptions<ReactiveDataDocument<T[]>>;

export function query(
  type: string,
  options?: QueryOptions,
): QueryRequestOptions;

export function query(
  type: string,
  options: QueryOptions = {},
): QueryRequestOptions {
  const headers = new Headers();
  headers.append('Accept', 'application/json;charset=utf-8');

  const url = buildPostgrestBaseURL(
    type,
    pluralizeType(underscore(type)),
    options,
  );

  const queryParams = new URLSearchParams();

  const select = serializePostgrestSelect(options.include, options.fields);

  queryParams.append('select', select);
  if (options.order) {
    queryParams.append('order', serializePostgrestOrder(options.order));
  }
  appendQueryParams(options.filter, queryParams);

  let pagination: PostgrestPaginationRequestOptions | undefined;
  if (options.page) {
    const {
      size,
      number = 1,
      count = DEFAULT_POSTGREST_COUNT_MODE,
    } = options.page;
    assertPositiveSafeInteger(size, 'page.size');
    assertPositiveSafeInteger(number, 'page.number');
    if (!isPostgrestCountMode(count)) {
      throw new RangeError('page.count must be exact, planned, or estimated.');
    }

    const offset = (number - 1) * size;
    if (!Number.isSafeInteger(offset)) {
      throw new RangeError(
        'page.number and page.size produce an unsafe PostgREST offset.',
      );
    }

    queryParams.set('limit', String(size));
    queryParams.set('offset', String(offset));
    headers.append('Prefer', `count=${count}`);
    pagination = { count };
  }

  const queryString = buildQueryParams(queryParams);

  return {
    url: queryString ? `${url}?${queryString}` : url,
    method: 'GET',
    headers,
    op: 'query',
    options: {
      type: type,
      ...(pagination ? { postgrestPagination: pagination } : {}),
    },
  };
}

function assertPositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive safe integer.`);
  }
}

export type { PageOptions, PostgrestCountMode };

function appendQueryParams(
  params: Filters = {},
  searchParams: URLSearchParams,
) {
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
