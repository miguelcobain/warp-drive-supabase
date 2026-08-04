import type {
  ImmutableRequestInfo,
  RequestInfo,
} from '@warp-drive/core/types/request';

import {
  isPostgrestCountMode,
  type PostgrestCountMode,
  type PostgrestPaginationRequestOptions,
} from '../../pagination';

const TYPE_FRAGMENT_KEY = 'warp-drive-supabase-type';
const COUNT_FRAGMENT_KEY = 'warp-drive-supabase-count';
const RELATIVE_URL_BASE = 'http://warp-drive-supabase.invalid';

interface PaginationContext {
  type: string;
  count: PostgrestCountMode;
  url: string;
}

interface ParsedContentRange {
  start: number;
  end: number;
  total: number;
}

export interface JsonApiPagination {
  links: {
    self: string;
    first: string;
    prev: string | null;
    next: string | null;
    last: string;
  };
  meta: {
    page: {
      total: number;
    };
  };
}

export function preparePaginatedRequest(request: ImmutableRequestInfo): {
  request: RequestInfo;
  pagination: PaginationContext | null;
} {
  const explicitType = request.options?.['type'];
  const explicitPagination = request.options?.['postgrestPagination'] as
    | PostgrestPaginationRequestOptions
    | undefined;

  if (
    typeof explicitType === 'string' &&
    explicitPagination &&
    isPostgrestCountMode(explicitPagination.count)
  ) {
    return {
      request: request as RequestInfo,
      pagination: {
        type: explicitType,
        count: explicitPagination.count,
        url: request.url ?? '',
      },
    };
  }

  if (!request.url) {
    return { request: request as RequestInfo, pagination: null };
  }

  const parsed = parseUrl(request.url);
  const fragment = new URLSearchParams(parsed.url.hash.slice(1));
  const type = fragment.get(TYPE_FRAGMENT_KEY);
  const count = fragment.get(COUNT_FRAGMENT_KEY);

  if (!type || !isPostgrestCountMode(count)) {
    return { request: request as RequestInfo, pagination: null };
  }

  parsed.url.hash = '';
  const cleanUrl = formatUrl(parsed.url, parsed.isAbsolute);
  const headers = new Headers(request.headers);
  setCountPreference(headers, count);

  const paginationOptions: PostgrestPaginationRequestOptions = { count };
  const preparedRequest: RequestInfo = {
    ...request,
    url: cleanUrl,
    headers,
    options: {
      ...request.options,
      type,
      postgrestPagination: paginationOptions,
    },
  };

  return {
    request: preparedRequest,
    pagination: { type, count, url: cleanUrl },
  };
}

export function buildJsonApiPagination(
  requestUrl: string,
  contentRange: string | null,
  context: Pick<PaginationContext, 'type' | 'count'>,
): JsonApiPagination {
  const range = parseContentRange(contentRange);
  const parsed = parseUrl(requestUrl);
  const requestedSize = parsePositiveInteger(
    parsed.url.searchParams.get('limit'),
    'limit',
  );
  const returnedSize =
    range.end >= range.start ? range.end - range.start + 1 : 0;

  const effectiveSize =
    returnedSize > 0 &&
    returnedSize < requestedSize &&
    range.end + 1 < range.total
      ? returnedSize
      : requestedSize;
  const start = range.total === 0 ? 0 : range.start;
  const lastOffset =
    range.total === 0
      ? 0
      : Math.floor((range.total - 1) / effectiveSize) * effectiveSize;
  const previousOffset = start > 0 ? Math.max(0, start - effectiveSize) : null;
  const nextOffset = range.end + 1 < range.total ? range.end + 1 : null;

  return {
    links: {
      self: buildPageLink(
        parsed.url,
        parsed.isAbsolute,
        start,
        effectiveSize,
        context,
      ),
      first: buildPageLink(
        parsed.url,
        parsed.isAbsolute,
        0,
        effectiveSize,
        context,
      ),
      prev:
        previousOffset === null
          ? null
          : buildPageLink(
              parsed.url,
              parsed.isAbsolute,
              previousOffset,
              effectiveSize,
              context,
            ),
      next:
        nextOffset === null
          ? null
          : buildPageLink(
              parsed.url,
              parsed.isAbsolute,
              nextOffset,
              effectiveSize,
              context,
            ),
      last: buildPageLink(
        parsed.url,
        parsed.isAbsolute,
        lastOffset,
        effectiveSize,
        context,
      ),
    },
    meta: {
      page: {
        total: range.total,
      },
    },
  };
}

function parseContentRange(value: string | null): ParsedContentRange {
  if (!value) {
    throw new Error(
      'Expected a numeric Content-Range header for a paginated PostgREST response.',
    );
  }

  const emptyMatch = /^\*\/(\d+)$/.exec(value.trim());
  if (emptyMatch) {
    const total = Number(emptyMatch[1]);
    if (total === 0) {
      return { start: 0, end: -1, total };
    }
  }

  const match = /^(\d+)-(\d+)\/(\d+)$/.exec(value.trim());
  if (!match) {
    throw new Error(
      `Expected a numeric Content-Range header for a paginated PostgREST response, received ${JSON.stringify(value)}.`,
    );
  }

  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = Number(match[3]);
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    !Number.isSafeInteger(total) ||
    end < start
  ) {
    throw new Error(
      `Received an invalid PostgREST Content-Range header: ${JSON.stringify(value)}.`,
    );
  }

  return { start, end, total };
}

function parsePositiveInteger(value: string | null, name: string): number {
  const parsed = value === null ? Number.NaN : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(
      `Expected paginated PostgREST URL to contain a positive ${name} value.`,
    );
  }
  return parsed;
}

function buildPageLink(
  baseUrl: URL,
  isAbsolute: boolean,
  offset: number,
  size: number,
  context: Pick<PaginationContext, 'type' | 'count'>,
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('limit', String(size));
  url.searchParams.set('offset', String(offset));

  const fragment = new URLSearchParams();
  fragment.set(TYPE_FRAGMENT_KEY, context.type);
  fragment.set(COUNT_FRAGMENT_KEY, context.count);
  url.hash = fragment.toString();

  return formatUrl(url, isAbsolute);
}

function setCountPreference(headers: Headers, count: PostgrestCountMode): void {
  const preferences = (headers.get('Prefer') ?? '')
    .split(',')
    .map((preference) => preference.trim())
    .filter((preference) => preference && !preference.startsWith('count='));
  preferences.push(`count=${count}`);
  headers.set('Prefer', preferences.join(', '));
}

function parseUrl(value: string): { url: URL; isAbsolute: boolean } {
  try {
    return { url: new URL(value), isAbsolute: true };
  } catch {
    return { url: new URL(value, RELATIVE_URL_BASE), isAbsolute: false };
  }
}

function formatUrl(url: URL, isAbsolute: boolean): string {
  return isAbsolute
    ? url.toString()
    : `${url.pathname}${url.search}${url.hash}`;
}
