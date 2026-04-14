import type { TypeFromInstance } from '@warp-drive/core/types/record';

import type {
  FindRecordOptions,
  FindRecordRequestOptions as BaseFindRecordRequestOptions,
  RemotelyAccessibleIdentifier,
} from '@warp-drive/core/types/request';
import type { SingleResourceDataDocument } from '@warp-drive/core/types/spec/document';

import { serializePostgrestSelect } from './utils/query-params';
import { pluralizeType, underscore } from '../utils/string';
import { buildBaseURL, buildQueryParams, type QueryUrlOptions } from '../utils/url';

export type FindRecordResultDocument<T> = Omit<SingleResourceDataDocument<T>, 'data'> & { data: T };

type FindRecordRequestOptions<RT = unknown, T = unknown> = BaseFindRecordRequestOptions<RT, T> & {
  options?: Record<string, unknown>;
};

export function findRecord<T>(
  identifier: RemotelyAccessibleIdentifier<TypeFromInstance<T>>,
  options?: FindRecordOptions
): FindRecordRequestOptions<FindRecordResultDocument<T>, T>;

export function findRecord(
  identifier: RemotelyAccessibleIdentifier,
  options?: FindRecordOptions
): FindRecordRequestOptions;

export function findRecord<T>(
  type: TypeFromInstance<T>,
  id: string,
  options?: FindRecordOptions
): FindRecordRequestOptions<FindRecordResultDocument<T>, T>;
export function findRecord(type: string, id: string, options?: FindRecordOptions): FindRecordRequestOptions;

export function findRecord<T>(
  arg1: TypeFromInstance<T> | RemotelyAccessibleIdentifier<TypeFromInstance<T>>,
  arg2: string | FindRecordOptions | undefined,
  arg3?: FindRecordOptions
): FindRecordRequestOptions<FindRecordResultDocument<T>, T> {
  const identifier: RemotelyAccessibleIdentifier<TypeFromInstance<T>> =
    typeof arg1 === 'string' ? { type: arg1, id: arg2 as string } : arg1;
  const options = ((typeof arg1 === 'string' ? arg3 : arg2) || {}) as FindRecordOptions;

  const urlOptions: QueryUrlOptions = {
    identifier,
    op: 'query',
    resourcePath: pluralizeType(underscore(identifier.type)),
  };

  const url = buildBaseURL(urlOptions);

  const headers = new Headers();
  // Set the content type to application/vnd.pgrst.object+json to request a single object
  // https://docs.postgrest.org/en/latest/references/api/resource_representation.html#singular-or-plural
  headers.append('Accept', 'application/vnd.pgrst.object+json');

  const params = buildQueryParams({
    id: `eq.${identifier.id}`,
    select: serializePostgrestSelect(options.include)
  }, options.urlParamsSettings);

  return {
    url: `${url}?${params}`,
    method: 'GET',
    headers,
    op: 'findRecord',
    records: [identifier],
    options: {
      type: identifier.type
    }
  };
}
