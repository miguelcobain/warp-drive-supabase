import { RequestManager } from '@warp-drive/core';
import Fetch from '@ember-data/request/fetch';
import {
  createRecord,
  createSupabaseAuthHandler,
  findRecord,
  query,
  SupabaseJsonApiHandler,
  SupabaseUpdatesHandler,
  updateRecord,
} from 'warp-drive-supabase';

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
  })
);

store.request(findRecord('user', '1', { include: ['role'] }));
store.request(createRecord(draftPost));
store.request(updateRecord(post));
