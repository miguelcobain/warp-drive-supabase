import type { Handler, NextFn } from '@warp-drive/core/request';
import type { StoreRequestContext } from '@warp-drive/core';

export interface CreateSupabaseAuthHandlerOptions {
  apiKey: string;
  authorizationScheme?: string;
  getAccessToken?: () => string | null | undefined | Promise<string | null | undefined>;
}

export function createSupabaseAuthHandler({
  apiKey,
  authorizationScheme = 'Bearer',
  getAccessToken,
}: CreateSupabaseAuthHandlerOptions): Handler {
  if (!apiKey) {
    throw new Error('createSupabaseAuthHandler requires an apiKey.');
  }

  return {
    async request<T>(context: StoreRequestContext, next: NextFn<T>) {
      const headers = new Headers(context.request.headers);

      headers.set('apikey', apiKey);

      const accessToken = await getAccessToken?.();
      if (accessToken) {
        headers.set('Authorization', `${authorizationScheme} ${accessToken}`);
      }

      return next({ ...context.request, headers });
    },
  };
}
