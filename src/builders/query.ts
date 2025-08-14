import { underscore } from '@ember/string';
import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core/types/record';
import type { QueryRequestOptions as BaseQueryRequestOptions } from '@warp-drive/core/types/request';
import type { CollectionResourceDataDocument } from '@warp-drive/core/types/spec/document';

import { buildBaseURL, buildQueryParams, type QueryUrlOptions } from '@warp-drive/utilities';
import { pluralize } from '@warp-drive/utilities/string';

import { serializePostgrestSelect } from './utils/query-params';

import type { Includes } from '@warp-drive/core-types/record';

interface QueryOptions<T = unknown> {
  include?: T extends TypedRecordInstance ? Includes<T>[] : string | string[];
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
  const queryString = buildQueryParams({
    select: serializePostgrestSelect(options.include)
  });

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
