import type { Handler, NextFn } from '@warp-drive/core/request';
import type { StoreRequestContext } from '@warp-drive/core';
import type { StructuredDataDocument } from '@warp-drive/core/types/request';
import { serializeToJsonAPI } from './utils/json-api-serializer';
import {
  buildJsonApiPagination,
  preparePaginatedRequest,
} from './utils/postgrest-pagination';

export const SupabaseJsonApiHandler: Handler = {
  async request<T>(context: StoreRequestContext, next: NextFn<T>) {
    const prepared = preparePaginatedRequest(context.request);
    const type = prepared.request.options?.type;
    // if we don't know the resource type, don't try to transform
    if (typeof type !== 'string') {
      return next(context.request);
    }

    const result = await next(prepared.request);

    if (
      'response' in result &&
      result.response &&
      'ok' in result.response &&
      result.response.ok === false
    ) {
      return result;
    }

    // get JSON body (Fetch usually gives you parsed JSON in result.content; fall back to response.json())
    const raw =
      result?.content ??
      ('response' in result &&
      result.response &&
      'json' in result.response &&
      typeof result.response.json === 'function'
        ? await result.response.json()
        : undefined);
    if (raw === undefined) {
      return result;
    }

    const jsonApiDocument = serializeToJsonAPI(
      context.request.store.schema,
      raw,
      type,
    );
    const pagination = prepared.pagination
      ? buildJsonApiPagination(
          prepared.pagination.url,
          'response' in result && result.response
            ? result.response.headers.get('Content-Range')
            : null,
          prepared.pagination,
        )
      : null;

    // return same envelope, but with JSON:API content so the Store can update the JSONAPICache
    return {
      ...result,
      content: pagination
        ? { ...jsonApiDocument, ...pagination }
        : jsonApiDocument,
    } as StructuredDataDocument<T>;
  },
};

export default SupabaseJsonApiHandler;
