import WarpDriveCore from '@warp-drive/core';
import type { ResourceKey } from '@warp-drive/core/types/identifier';
import type { TypedRecordInstance } from '@warp-drive/core/types/record';
import type { ConstrainedRequestOptions, CreateRequestOptions as BaseCreateRequestOptions } from '@warp-drive/core/types/request';
import type { ReactiveDataDocument } from '@warp-drive/core/reactive';
import { buildBaseURL, buildQueryParams, type QueryUrlOptions, type UrlOptions } from '../utils/url';
import { pluralizeType, underscore } from '../utils/string';

const { recordIdentifierFor } = WarpDriveCore as typeof import('@warp-drive/core');

type CreateRequestOptions<RT = unknown, T = unknown> = BaseCreateRequestOptions<RT, T> & {
  options?: Record<string, unknown>;
};

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

function hasType(identifier: ResourceKey): boolean {
  return 'type' in identifier && identifier.type !== null;
}

export function createRecord<T extends TypedRecordInstance, RT extends TypedRecordInstance = T>(
  record: T,
  options?: ConstrainedRequestOptions
): CreateRequestOptions<ReactiveDataDocument<RT>, T>;
export function createRecord(
  record: unknown,
  options?: ConstrainedRequestOptions
): CreateRequestOptions;
export function createRecord(
  record: unknown,
  options: ConstrainedRequestOptions = {}
): CreateRequestOptions {
  const identifier = recordIdentifierFor(record);
  if (!identifier) {
    throw new Error('createRecord expected a Warp Drive record instance.');
  }
  if (!hasType(identifier)) {
    throw new Error('createRecord requires a record with a type.');
  }

  const urlOptions: QueryUrlOptions = {
    identifier,
    op: 'query',
    resourcePath: pluralizeType(underscore(identifier.type)),
  };

  copyForwardUrlOptions(urlOptions, options);

  const url = buildBaseURL(urlOptions);
  const headers = new Headers();

  headers.append('Accept', 'application/vnd.pgrst.object+json');
  headers.append('Content-Type', 'application/json');
  headers.append('Prefer', 'missing=default, return=representation');

  const params = buildQueryParams(
    {
      select: '*',
    },
    options.urlParamsSettings
  );

  return {
    url: `${url}?${params}`,
    method: 'POST',
    headers,
    op: 'createRecord',
    data: {
      record: identifier,
    },
    records: [identifier],
    options: {
      type: identifier.type,
    },
  };
}
