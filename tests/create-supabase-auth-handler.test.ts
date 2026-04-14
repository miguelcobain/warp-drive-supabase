import { createSupabaseAuthHandler } from '../src/auth/create-supabase-auth-handler';

describe('createSupabaseAuthHandler', () => {
  it('adds the Supabase API key and bearer token', async () => {
    const handler = createSupabaseAuthHandler({
      apiKey: 'public-anon-key',
      getAccessToken: async () => 'access-token',
    });
    const next = vi.fn(async (request) => request);

    const result = (await handler.request(
      {
        request: {
          headers: new Headers(),
        },
      } as never,
      next as never
    )) as { headers: Headers };

    expect(result.headers.get('apikey')).toBe('public-anon-key');
    expect(result.headers.get('Authorization')).toBe('Bearer access-token');
  });

  it('omits Authorization when no token is available', async () => {
    const handler = createSupabaseAuthHandler({
      apiKey: 'public-anon-key',
      getAccessToken: async () => null,
    });
    const next = vi.fn(async (request) => request);

    const result = (await handler.request(
      {
        request: {
          headers: new Headers(),
        },
      } as never,
      next as never
    )) as { headers: Headers };

    expect(result.headers.get('apikey')).toBe('public-anon-key');
    expect(result.headers.has('Authorization')).toBe(false);
  });
});
