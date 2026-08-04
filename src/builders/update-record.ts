import { recordIdentifierFor } from '@warp-drive/core';
import type { PersistedResourceKey, ResourceKey } from '@warp-drive/core/types/identifier';
import type { TypedRecordInstance } from '@warp-drive/core/types/record';
import type { ConstrainedRequestOptions, UpdateRequestOptions as BaseUpdateRequestOptions } from '@warp-drive/core/types/request';
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { buildQueryParams } from '../utils/url';
import { pluralizeType, underscore } from '../utils/string';
import { buildPostgrestBaseURL } from './utils/url-options';

type UpdateRequestOptions<RT = unknown, T = unknown> = BaseUpdateRequestOptions<RT, T> & {
  options?: Record<string, unknown>;
};

function isExisting(identifier: ResourceKey): identifier is PersistedResourceKey {
  return 'id' in identifier && identifier.id !== null && 'type' in identifier && identifier.type !== null;
}

export function updateRecord<T extends TypedRecordInstance, RT extends TypedRecordInstance = T>(
  record: T,
  options?: ConstrainedRequestOptions
): UpdateRequestOptions<ReactiveDataDocument<RT>, T>;
export function updateRecord(
  record: unknown,
  options?: ConstrainedRequestOptions
): UpdateRequestOptions;
export function updateRecord(
  record: unknown,
  options: ConstrainedRequestOptions = {}
): UpdateRequestOptions {
  const identifier = recordIdentifierFor(record);
  if (!identifier) {
    throw new Error('updateRecord expected a Warp Drive record instance.');
  }
  if (!isExisting(identifier)) {
    throw new Error('updateRecord requires a persisted record with both type and id.');
  }

  const url = buildPostgrestBaseURL(
    identifier.type,
    pluralizeType(underscore(identifier.type)),
    options
  );
  const headers = new Headers();

  // Set the content type to application/vnd.pgrst.object+json to request a single object
  // https://docs.postgrest.org/en/latest/references/api/resource_representation.html#singular-or-plural
  headers.append('Accept', 'application/vnd.pgrst.object+json');
  headers.append('Content-Type', 'application/json');
  headers.append('Prefer', 'missing=default, return=representation');

  const params = buildQueryParams({
    id: `eq.${identifier.id}`,
    select: '*'
  }, options.urlParamsSettings);

  return {
    url: `${url}?${params}`,
    method: 'PATCH',
    headers,
    op: 'updateRecord',
    data: {
      record: identifier,
    },
    records: [identifier],
    options: {
      type: identifier.type
    },
  };
}
