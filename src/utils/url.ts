import type { QueryParamsSerializationOptions, Serializable } from '@warp-drive/core/types/params';

function appendParam(
  searchParams: URLSearchParams,
  key: string,
  value: Exclude<Serializable, Serializable[]>
): void {
  searchParams.append(key, String(value));
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
