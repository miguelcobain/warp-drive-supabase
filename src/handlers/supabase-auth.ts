import type { Handler, NextFn } from '@ember-data/request';
import type { StoreRequestContext } from '@ember-data/store';
import ENV from 'my-app/config/environment';
import SupabaseService from 'my-app/services/supabase';
import { inject as service } from '@ember/service';

export default class SupabaseAuthHandler implements Handler {
  @service declare supabase: SupabaseService; // custom service that inistializes Supabase client

  async request<T>(context: StoreRequestContext, next: NextFn<T>) {
    const headers = new Headers(context.request.headers);
    headers.append('apikey', ENV.supabase.key);

    const session = await this.supabase.client.auth.getSession();

    if (session.data.session?.access_token) {
      headers.append(
        'Authorization',
        `Bearer ${session.data.session.access_token}`,
      );
    }

    return next(Object.assign({}, context.request, { headers }));
  }
}
