import { SupabaseUpdatesHandler } from '../src/handlers/postgrest-updates';

describe('SupabaseUpdatesHandler', () => {
  it('serializes changed attrs into a patch payload', async () => {
    const next = vi.fn(async (request) => request);

    const result = (await SupabaseUpdatesHandler.request(
      {
        request: {
          op: 'updateRecord',
          headers: new Headers(),
          data: { record: { type: 'post', id: '1', lid: 'post-1' } },
          store: {
            schema: {
              fields() {
                return new Map([
                  ['title', { kind: 'field', name: 'title' }],
                  ['publishedAt', { kind: 'field', name: 'publishedAt', sourceKey: 'published_at' }],
                ]);
              },
            },
            cache: {
              changedAttrs() {
                return {
                  title: ['Old title', 'New title'],
                  publishedAt: [null, '2024-01-01T00:00:00Z'],
                };
              },
            },
          },
        },
      } as never,
      next as never
    )) as { body: string };

    expect(next).toHaveBeenCalledTimes(1);
    expect(result.body).toBe(
      JSON.stringify({
        title: 'New title',
        published_at: '2024-01-01T00:00:00Z',
      })
    );
  });

  it('passes through when the request already has a body', async () => {
    const request = {
      op: 'updateRecord',
      body: '{"title":"Prebuilt"}',
      headers: new Headers(),
      data: { record: { type: 'post', id: '1', lid: 'post-1' } },
      store: {
        schema: {
          fields() {
            return new Map();
          },
        },
        cache: {
          changedAttrs() {
            return {};
          },
        },
      },
    };
    const next = vi.fn(async (value) => value);

    const result = await SupabaseUpdatesHandler.request(
      { request } as never,
      next as never
    );

    expect(result).toBe(request);
  });

  it('serializes changed attrs for create requests too', async () => {
    const next = vi.fn(async (request) => request);

    const result = (await SupabaseUpdatesHandler.request(
      {
        request: {
          op: 'createRecord',
          headers: new Headers(),
          data: { record: { type: 'post', id: null, lid: 'post-new' } },
          store: {
            schema: {
              fields() {
                return new Map([
                  ['title', { kind: 'field', name: 'title' }],
                  ['createdAt', { kind: 'field', name: 'createdAt', sourceKey: 'created_at' }],
                ]);
              },
            },
            cache: {
              changedAttrs() {
                return {
                  title: [undefined, 'Draft'],
                  createdAt: [undefined, '2024-01-01T00:00:00Z'],
                };
              },
            },
          },
        },
      } as never,
      next as never
    )) as { body: string };

    expect(result.body).toBe(
      JSON.stringify({
        title: 'Draft',
        created_at: '2024-01-01T00:00:00Z',
      })
    );
  });

  it('falls back to underscoring when schema metadata is unavailable', async () => {
    const next = vi.fn(async (request) => request);

    const result = (await SupabaseUpdatesHandler.request(
      {
        request: {
          op: 'updateRecord',
          headers: new Headers(),
          data: { record: { type: 'post', id: '1', lid: 'post-1' } },
          store: {
            cache: {
              changedAttrs() {
                return {
                  publishedAt: [null, '2024-01-01T00:00:00Z'],
                };
              },
            },
          },
        },
      } as never,
      next as never
    )) as { body: string };

    expect(result.body).toBe(
      JSON.stringify({
        published_at: '2024-01-01T00:00:00Z',
      })
    );
  });
});
