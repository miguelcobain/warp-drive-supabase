import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';
import { setBuildURLConfig } from '@warp-drive/utilities';

import ENV from 'test-app/config/environment';
import { RESOURCE_SCHEMAS } from 'test-app/schemas';

import {
  SupabaseJsonApiHandler,
  SupabaseUpdatesHandler,
  createSupabaseAuthHandler,
} from 'warp-drive-supabase';

setBuildURLConfig({
  host: ENV.supabase.url.replace(/\/+$/, ''),
  namespace: 'rest/v1',
});

const Store = useRecommendedStore({
  cache: JSONAPICache,
  handlers: [
    createSupabaseAuthHandler({
      apiKey: 'anon-test-key',
      getAccessToken: () => Promise.resolve('test-access-token'),
    }),
    SupabaseUpdatesHandler,
    SupabaseJsonApiHandler,
  ],
  schemas: RESOURCE_SCHEMAS,
});

type Store = InstanceType<typeof Store>;

export default Store;
