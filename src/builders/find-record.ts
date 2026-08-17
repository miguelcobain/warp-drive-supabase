import type {
  TypedRecordInstance,
  TypeFromInstance,
} from '@warp-drive/core/types/record';
import type {
  ConstrainedRequestOptions,
  FindRecordRequestOptions as BaseFindRecordRequestOptions,
  RemotelyAccessibleIdentifier,
} from '@warp-drive/core/types/request';
import type { SingleResourceDataDocument } from '@warp-drive/core/types/spec/document';

import {
  appendFluentSelection,
  createFluentFindRecord,
  type FindRecordBuilder,
  type FindRecordCallback,
} from './utils/fluent-query';
import type { SupabaseContext, SupabaseRow } from './supabase-table';
import { pluralizeType, underscore } from '../utils/string';
import { buildQueryParams } from '../utils/url';
import { buildPostgrestBaseURL } from './utils/url-options';

export type FindRecordResultDocument<T> = Omit<
  SingleResourceDataDocument<T>,
  'data'
> & { data: T };

export interface FindRecordOptions extends ConstrainedRequestOptions {}

type FindRecordRequestOptions<
  RT = unknown,
  T = unknown,
> = BaseFindRecordRequestOptions<RT, T> & {
  options?: Record<string, unknown>;
};

type FindRecordBuilderFor<T> = [SupabaseContext<T>] extends [never]
  ? FindRecordBuilder<Record<string, unknown>, never>
  : FindRecordBuilder<SupabaseRow<T>, SupabaseContext<T>>;

export type FindRecordCallbackFor<T> = (
  record: FindRecordBuilderFor<T>,
) => void;

export function findRecord<T extends TypedRecordInstance>(
  identifier: RemotelyAccessibleIdentifier<TypeFromInstance<T>>,
  configure?: FindRecordCallbackFor<T>,
  options?: FindRecordOptions,
): FindRecordRequestOptions<FindRecordResultDocument<T>, T>;

export function findRecord(
  identifier: RemotelyAccessibleIdentifier,
  configure?: FindRecordCallback,
  options?: FindRecordOptions,
): FindRecordRequestOptions;

export function findRecord<T extends TypedRecordInstance>(
  type: TypeFromInstance<T>,
  id: string,
  configure?: FindRecordCallbackFor<T>,
  options?: FindRecordOptions,
): FindRecordRequestOptions<FindRecordResultDocument<T>, T>;

export function findRecord(
  type: string,
  id: string,
  configure?: FindRecordCallback,
  options?: FindRecordOptions,
): FindRecordRequestOptions;

export function findRecord(
  arg1: string | RemotelyAccessibleIdentifier,
  arg2: any,
  arg3?: any,
  arg4: FindRecordOptions = {},
): FindRecordRequestOptions {
  const identifier: RemotelyAccessibleIdentifier =
    typeof arg1 === 'string' ? { type: arg1, id: arg2 as string } : arg1;
  const configure = (typeof arg1 === 'string' ? arg3 : arg2) as
    | FindRecordCallback
    | undefined;
  const options = (typeof arg1 === 'string' ? arg4 : arg3) as
    | FindRecordOptions
    | undefined;

  if (typeof identifier.id !== 'string' || identifier.id.length === 0) {
    throw new TypeError('findRecord id must be a non-empty string.');
  }
  if (configure !== undefined && typeof configure !== 'function') {
    throw new TypeError('findRecord configure must be a function.');
  }

  const requestOptions = options ?? {};
  const url = buildPostgrestBaseURL(
    identifier.type,
    pluralizeType(underscore(identifier.type)),
    requestOptions,
  );

  const headers = new Headers();
  headers.append('Accept', 'application/vnd.pgrst.object+json');

  const queryParams = new URLSearchParams();
  queryParams.append('id', `eq.${identifier.id}`);
  appendFluentSelection(
    createFluentFindRecord(configure as (record: unknown) => void),
    queryParams,
  );

  return {
    url: `${url}?${buildQueryParams(queryParams)}`,
    method: 'GET',
    headers,
    op: 'findRecord',
    records: [identifier],
    options: {
      type: identifier.type,
    },
  };
}

export type { FindRecordBuilder, FindRecordCallback };
