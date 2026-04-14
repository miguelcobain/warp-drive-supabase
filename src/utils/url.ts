import type { QueryParamsSerializationOptions, Serializable } from '@warp-drive/core/types/params';
import type { RemotelyAccessibleIdentifier } from '@warp-drive/core/types/request';

export interface UrlOptions {
  host?: string;
  namespace?: string;
  resourcePath?: string;
}

export interface QueryUrlOptions extends UrlOptions {
  identifier?: {
    type: RemotelyAccessibleIdentifier['type'];
    id?: RemotelyAccessibleIdentifier['id'] | null;
    lid?: RemotelyAccessibleIdentifier['lid'];
  };
  op: string;
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function appendParam(
  searchParams: URLSearchParams,
  key: string,
  value: Exclude<Serializable, Serializable[]>
): void {
  searchParams.append(key, String(value));
}

export function buildBaseURL({ host, namespace, resourcePath }: UrlOptions): string {
  const segments = [namespace, resourcePath]
    .filter((segment): segment is string => Boolean(segment))
    .map((segment) => trimSlashes(segment));

  const path = segments.length > 0 ? `/${segments.join('/')}` : '/';
  const normalizedHost = host ? host.replace(/\/+$/g, '') : '';

  return normalizedHost ? `${normalizedHost}${path}` : path;
}

export function buildQueryParams(
  params: URLSearchParams | Record<string, Serializable>,
  options: QueryParamsSerializationOptions = {}
): string {
  if (params instanceof URLSearchParams) {
    return params.toString();
  }

  const searchParams = new URLSearchParams();
  const arrayFormat = options.arrayFormat ?? 'repeat';

  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue === undefined) {
      continue;
    }

    if (Array.isArray(rawValue)) {
      if (arrayFormat === 'comma') {
        searchParams.set(key, rawValue.map((value) => String(value)).join(','));
        continue;
      }

      rawValue.forEach((value, index) => {
        if (arrayFormat === 'indices') {
          appendParam(searchParams, `${key}[${index}]`, value);
        } else if (arrayFormat === 'bracket') {
          appendParam(searchParams, `${key}[]`, value);
        } else {
          appendParam(searchParams, key, value);
        }
      });
      continue;
    }

    appendParam(searchParams, key, rawValue);
  }

  return searchParams.toString();
}
