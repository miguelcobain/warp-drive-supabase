import type { ConstrainedRequestOptions } from '@warp-drive/core/types/request';
import { buildBaseURL, type QueryUrlOptions } from '@warp-drive/utilities';

export function buildPostgrestBaseURL(
  type: string,
  defaultResourcePath: string,
  options: ConstrainedRequestOptions
): string {
  const urlOptions: QueryUrlOptions = {
    identifier: { type },
    op: 'query',
    resourcePath: defaultResourcePath,
  };

  copyForwardUrlOptions(urlOptions, options);

  return buildBaseURL(urlOptions);
}

function copyForwardUrlOptions(
  urlOptions: QueryUrlOptions,
  options: ConstrainedRequestOptions
): void {
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
