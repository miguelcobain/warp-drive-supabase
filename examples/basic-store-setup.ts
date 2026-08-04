import { RequestManager } from '@warp-drive/core';
import Fetch from '@ember-data/request/fetch';
import { setBuildURLConfig } from '@warp-drive/utilities';
import {
  createRecord,
  createSupabaseAuthHandler,
  findRecord,
  query,
  SupabaseJsonApiHandler,
  SupabaseUpdatesHandler,
  updateRecord,
} from 'warp-drive-supabase';

setBuildURLConfig({
  host: ENV.supabase.url.replace(/\/+$/, ''),
  namespace: 'rest/v1',
});

const requestManager = new RequestManager().use([
  createSupabaseAuthHandler({
    apiKey: ENV.supabase.key,
    getAccessToken: async () => {
      const session = await supabase.client.auth.getSession();
      return session.data.session?.access_token ?? null;
    },
  }),
  SupabaseUpdatesHandler,
  SupabaseJsonApiHandler,
  Fetch,
]);

store.request(
  query('post', {
    include: ['comments.author', 'author'],
    order: ['created_at.desc'],
    page: { size: 20 },
  }),
);

store.request(findRecord('user', '1', { include: ['role'] }));
store.request(createRecord(draftPost));
store.request(updateRecord(post));
