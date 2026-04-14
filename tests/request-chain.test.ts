import { createSupabaseAuthHandler } from '../src/auth/create-supabase-auth-handler';
import { SupabaseJsonApiHandler } from '../src/handlers/postgrest-json-api';

function createSchemaService() {
  return {
    fields() {
      return new Map([
        ['id', { kind: 'field', name: 'id' }],
        ['title', { kind: 'attribute', name: 'title' }],
      ]);
    },
  };
}

describe('handler chaining', () => {
  it('supports auth plus JSON:API transformation for read requests', async () => {
    const authHandler = createSupabaseAuthHandler({
      apiKey: 'anon',
      getAccessToken: async () => 'session-token',
    });

    const fetchStub = vi.fn(async (request) => ({
      request,
      content: [{ id: 1, title: 'Hello from PostgREST' }],
    }));

    const context = {
      request: {
        headers: new Headers(),
        options: { type: 'post' },
        store: { schema: createSchemaService() },
      },
    };

    const result = (await authHandler.request(
      context as never,
      ((authedRequest: any) =>
        SupabaseJsonApiHandler.request(
          { request: { ...authedRequest, store: context.request.store } } as never,
          fetchStub as never
        )) as never
    )) as { content: { data: unknown[] } };

    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(fetchStub.mock.calls[0]?.[0].headers.get('apikey')).toBe('anon');
    expect(fetchStub.mock.calls[0]?.[0].headers.get('Authorization')).toBe('Bearer session-token');
    expect(result.content.data).toHaveLength(1);
  });
});
