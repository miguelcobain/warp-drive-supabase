import { recordIdentifierFor } from '@warp-drive/core';
import type { PersistedResourceKey, ResourceKey } from '@warp-drive/core/types/identifier';
import type { TypedRecordInstance } from '@warp-drive/core/types/record';
import type { ConstrainedRequestOptions, DeleteRequestOptions as BaseDeleteRequestOptions } from '@warp-drive/core/types/request';
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { buildQueryParams } from '../utils/url';
import { pluralizeType, underscore } from '../utils/string';
import { buildPostgrestBaseURL } from './utils/url-options';

type DeleteRequestOptions<RT = unknown, T = unknown> = BaseDeleteRequestOptions<RT, T> & {
  options?: Record<string, unknown>;
};

function isExisting(identifier: ResourceKey): identifier is PersistedResourceKey {
  return 'id' in identifier && identifier.id !== null && 'type' in identifier && identifier.type !== null;
}

export function deleteRecord<T extends TypedRecordInstance, RT extends TypedRecordInstance = T>(
  record: T,
  options?: ConstrainedRequestOptions
): DeleteRequestOptions<ReactiveDataDocument<RT>, T>;
export function deleteRecord(
  record: unknown,
  options?: ConstrainedRequestOptions
): DeleteRequestOptions;
export function deleteRecord(
  record: unknown,
  options: ConstrainedRequestOptions = {}
): DeleteRequestOptions {
  const identifier = recordIdentifierFor(record);
  if (!identifier) {
    throw new Error('deleteRecord expected a Warp Drive record instance.');
  }
  if (!isExisting(identifier)) {
    throw new Error('deleteRecord requires a persisted record with both type and id.');
  }

  const url = buildPostgrestBaseURL(
    identifier.type,
    pluralizeType(underscore(identifier.type)),
    options
  );
  const headers = new Headers();

  const params = buildQueryParams(
    {
      id: `eq.${identifier.id}`,
    },
    options.urlParamsSettings
  );

  return {
    url: `${url}?${params}`,
    method: 'DELETE',
    headers,
    op: 'deleteRecord',
    data: {
      record: identifier,
    },
    records: [identifier],
    options: {
      type: identifier.type,
    },
  };
}
