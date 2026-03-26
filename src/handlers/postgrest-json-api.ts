import type { Handler, NextFn } from '@warp-drive/core/request';
import { serializeToJsonAPI } from './utils/json-api-serializer';
import type { StoreRequestContext } from '@warp-drive/core';

export const SupabaseJsonApiHandler: Handler = {
  async request<T>(context: StoreRequestContext, next: NextFn<T>) {
    // if we don't know the resource type, don't try to transform
    if (typeof context.request.options?.type !== 'string') {
      return next(context.request);
    }

    const result: any = await next(context.request);

    // get JSON body (Fetch usually gives you parsed JSON in result.content; fall back to response.json())
    const raw = result?.content ?? (await result.response?.json?.());

    const jsonApiDocument = serializeToJsonAPI(context.request.store.schema, raw, context.request.options['type'])

    // return same envelope, but with JSON:API content so the Store can update the JSONAPICache
    return { ...result, content: jsonApiDocument };
  }
};

export default SupabaseJsonApiHandler;
