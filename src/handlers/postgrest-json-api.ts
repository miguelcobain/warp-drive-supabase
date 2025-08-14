import type { Handler, NextFn } from '@ember-data/request';
import type { StoreRequestContext } from '@ember-data/store';

import { serializeToJsonAPI } from './utils/json-api-serializer';

export const PostgrestJsonApiHandler: Handler = {
  async request<T>(context: StoreRequestContext, next: NextFn<T>) {
    const result: any = await next(context.request);

    if (typeof context.request.options?.['type'] !== 'string') {
      return context.request;
    }

    // get JSON body (Fetch usually gives you parsed JSON in result.content; fall back to response.json())
    const raw = result?.content ?? (await result.response?.json?.());
    const data = context.request.op === 'findRecord' && Array.isArray(raw) && raw.length === 1 ? raw[0] : raw;

    const jsonApiDocument = serializeToJsonAPI(context.request.store.schema, data, context.request.options['type'])

    // return same envelope, but with JSON:API content so the Store can update the JSONAPICache
    return { ...result, content: jsonApiDocument };
  }
};

export default PostgrestJsonApiHandler;
