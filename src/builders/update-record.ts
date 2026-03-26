import { pluralize, underscore } from '@warp-drive/utilities/string';
import { recordIdentifierFor } from '@warp-drive/core';
import type { PersistedResourceKey, ResourceKey } from '@warp-drive/core-types/identifier';
import type { TypedRecordInstance } from '@warp-drive/core-types/record';
import type { ConstrainedRequestOptions, UpdateRequestOptions as BaseUpdateRequestOptions } from '@warp-drive/core-types/request';
import { assert } from '@warp-drive/core/build-config/macros';
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { buildBaseURL, buildQueryParams, type QueryUrlOptions, type UrlOptions } from '@warp-drive/utilities';

type UpdateRequestOptions<RT = unknown, T = unknown> = BaseUpdateRequestOptions<RT, T> & {
  options?: Record<string, unknown>;
};

function isExisting(identifier: ResourceKey): identifier is PersistedResourceKey {
  return 'id' in identifier && identifier.id !== null && 'type' in identifier && identifier.type !== null;
}

function copyForwardUrlOptions(urlOptions: UrlOptions, options: ConstrainedRequestOptions): void {
  if ('host' in options) {
    urlOptions.host = options.host;
  }
  if ('namespace' in options) {
    urlOptions.namespace = options.namespace;
  }
  if ('resourcePath' in options) {
    urlOptions.resourcePath = options.resourcePath;
  }
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
  assert(`Expected to be given a record instance`, identifier);
  assert(`Cannot update a record that does not have an associated type and id.`, isExisting(identifier));

  const urlOptions: QueryUrlOptions = {
    identifier: identifier,
    op: 'query',
    resourcePath: pluralize(underscore(identifier.type)),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildBaseURL(urlOptions);
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
