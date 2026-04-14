import type { Value } from '@warp-drive/core/types/json/raw';
import type { ResourceKey } from '@warp-drive/core/types/identifier';
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { StoreRequestContext } from '@warp-drive/core';
import { underscore } from '../utils/string';

const MUTATION_OPS = new Set(['createRecord', 'updateRecord']);

export const SupabaseUpdatesHandler: Handler = {
  async request<T>(context: StoreRequestContext, next: NextFn<T>) {
    const { data, store, body, op } = context.request;

    if ((op && !MUTATION_OPS.has(op)) || body || !data?.['record']) {
      // Not a mutation, or body is already set, or no data.record: do nothing
      return next(context.request);
    }

    const attributeDiffMap = store.cache.changedAttrs(data['record'] as ResourceKey);
    // const relationshipDiffMap = store.cache.changedRelationships(data['record']);
    // const patchPayload = serializePatch(store.cache, data['record']);

    const payload: Record<string, Value> = {};

    for (const [key, value] of Object.entries(attributeDiffMap)) {
      const attr = underscore(key);
      const [, newValue] = value;
      payload[attr] = newValue;
    }

    const newRequestParams = Object.assign({}, context.request, {
      body: JSON.stringify(payload),
    });

    return next(newRequestParams);
  },
};

export default SupabaseUpdatesHandler;
