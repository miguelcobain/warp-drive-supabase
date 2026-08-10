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

describe('SupabaseJsonApiHandler', () => {
  it('transforms raw PostgREST payloads into JSON:API documents', async () => {
    const next = vi.fn(async () => ({ content: [{ id: 1, title: 'Hello' }] }));

    const result = (await SupabaseJsonApiHandler.request(
      {
        request: {
          headers: new Headers(),
          options: { type: 'post' },
          store: { schema: createSchemaService() },
        },
      } as never,
      next as never,
    )) as { content: unknown };

    expect(next).toHaveBeenCalledTimes(1);
    expect(result.content).toEqual({
      data: [
        {
          id: '1',
          type: 'post',
          attributes: { title: 'Hello' },
          relationships: {},
        },
      ],
    });
  });

  it('passes through when request type is not known', async () => {
    const response = { content: { ok: true } };
    const next = vi.fn(async () => response);

    const result = await SupabaseJsonApiHandler.request(
      {
        request: {
          headers: new Headers(),
          options: {},
          store: { schema: createSchemaService() },
        },
      } as never,
      next as never,
    );

    expect(result).toBe(response);
  });

  it('passes through error responses without transforming them', async () => {
    const response = {
      response: new Response(JSON.stringify({ message: 'boom' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
      content: { message: 'boom' },
    };
    const next = vi.fn(async () => response);

    const result = await SupabaseJsonApiHandler.request(
      {
        request: {
          headers: new Headers(),
          options: { type: 'post' },
          store: { schema: createSchemaService() },
        },
      } as never,
      next as never,
    );

    expect(result).toBe(response);
  });

  it('adds JSON:API pagination links and metadata from Content-Range', async () => {
    const next = vi.fn(async () => ({
      response: new Response(JSON.stringify([]), {
        status: 206,
        headers: { 'Content-Range': '10-19/23' },
      }),
      content: [{ id: 11, title: 'Page two' }],
    }));

    const result = (await SupabaseJsonApiHandler.request(
      {
        request: {
          url: '/posts?select=*&order=id.asc&limit=10&offset=10',
          headers: new Headers({ Prefer: 'count=exact' }),
          options: {
            type: 'post',
            postgrestPagination: { count: 'exact' },
          },
          store: { schema: createSchemaService() },
        },
      } as never,
      next as never,
    )) as {
      content: {
        links: Record<string, string | null>;
        meta: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
        };
      };
    };

    expect(result.content.meta).toEqual({
      currentPage: 2,
      totalPages: 3,
      totalItems: 23,
    });
    expectPaginationLink(result.content.links.self, {
      limit: '10',
      offset: '10',
    });
    expectPaginationLink(result.content.links.first, {
      limit: '10',
      offset: '0',
    });
    expectPaginationLink(result.content.links.prev, {
      limit: '10',
      offset: '0',
    });
    expectPaginationLink(result.content.links.next, {
      limit: '10',
      offset: '20',
    });
    expectPaginationLink(result.content.links.last, {
      limit: '10',
      offset: '20',
    });
  });

  it('uses the returned range when PostgREST caps the requested page size', async () => {
    const next = vi.fn(async () => ({
      response: new Response(JSON.stringify([]), {
        status: 206,
        headers: { 'Content-Range': '0-4/12' },
      }),
      content: [{ id: 1, title: 'Capped page' }],
    }));

    const result = (await SupabaseJsonApiHandler.request(
      {
        request: {
          url: '/posts?select=*&limit=10&offset=0',
          headers: new Headers({ Prefer: 'count=planned' }),
          options: {
            type: 'post',
            postgrestPagination: { count: 'planned' },
          },
          store: { schema: createSchemaService() },
        },
      } as never,
      next as never,
    )) as {
      content: {
        links: Record<string, string | null>;
        meta: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
        };
      };
    };

    expect(result.content.meta).toEqual({
      currentPage: 1,
      totalPages: 3,
      totalItems: 12,
    });

    expectPaginationLink(result.content.links.next, {
      limit: '5',
      offset: '5',
      count: 'planned',
    });
    expectPaginationLink(result.content.links.last, {
      limit: '5',
      offset: '10',
      count: 'planned',
    });
  });

  it('recovers pagination context from a generated link before fetching it', async () => {
    const next = vi.fn(async (request) => ({
      request,
      response: new Response(JSON.stringify([]), {
        status: 206,
        headers: { 'Content-Range': '2-3/5' },
      }),
      content: [{ id: 3, title: 'Next page' }],
    }));
    const link =
      '/posts?select=*&limit=2&offset=2#warp-drive-supabase-type=post&warp-drive-supabase-count=estimated';

    const result = (await SupabaseJsonApiHandler.request(
      {
        request: {
          url: link,
          method: 'GET',
          headers: new Headers({ Prefer: 'return=representation' }),
          options: {},
          store: { schema: createSchemaService() },
        },
      } as never,
      next as never,
    )) as {
      content: {
        data: unknown[];
        meta: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
        };
      };
    };

    const forwardedRequest = next.mock.calls[0]?.[0];
    expect(forwardedRequest.url).toBe('/posts?select=*&limit=2&offset=2');
    expect(forwardedRequest.headers.get('Prefer')).toBe(
      'return=representation, count=estimated',
    );
    expect(forwardedRequest.options.type).toBe('post');
    expect(result.content.data).toHaveLength(1);
    expect(result.content.meta).toEqual({
      currentPage: 2,
      totalPages: 3,
      totalItems: 5,
    });
  });

  it('represents an empty page with bounded links', async () => {
    const next = vi.fn(async () => ({
      response: new Response(JSON.stringify([]), {
        headers: { 'Content-Range': '*/0' },
      }),
      content: [],
    }));

    const result = (await SupabaseJsonApiHandler.request(
      {
        request: {
          url: 'https://example.test/posts?limit=10&offset=0',
          headers: new Headers({ Prefer: 'count=exact' }),
          options: {
            type: 'post',
            postgrestPagination: { count: 'exact' },
          },
          store: { schema: createSchemaService() },
        },
      } as never,
      next as never,
    )) as {
      content: {
        links: Record<string, string | null>;
        meta: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
        };
      };
    };

    expect(result.content.meta).toEqual({
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
    });
    expect(result.content.links.prev).toBeNull();
    expect(result.content.links.next).toBeNull();
    expect(result.content.links.first).toBe(result.content.links.last);
    expect(result.content.links.self).toBe(result.content.links.first);
  });

  it('rejects paginated responses without a numeric Content-Range total', async () => {
    const next = vi.fn(async () => ({
      response: new Response(JSON.stringify([]), {
        headers: { 'Content-Range': '0-9/*' },
      }),
      content: [],
    }));

    await expect(
      SupabaseJsonApiHandler.request(
        {
          request: {
            url: '/posts?limit=10&offset=0',
            headers: new Headers({ Prefer: 'count=exact' }),
            options: {
              type: 'post',
              postgrestPagination: { count: 'exact' },
            },
            store: { schema: createSchemaService() },
          },
        } as never,
        next as never,
      ),
    ).rejects.toThrow('Expected a numeric Content-Range header');
  });
});

function expectPaginationLink(
  value: string | null | undefined,
  expected: { limit: string; offset: string; count?: string },
): void {
  expect(value).not.toBeNull();
  const url = new URL(value!, 'https://example.test');
  const fragment = new URLSearchParams(url.hash.slice(1));

  expect(url.searchParams.get('limit')).toBe(expected.limit);
  expect(url.searchParams.get('offset')).toBe(expected.offset);
  expect(url.searchParams.get('select')).toBe('*');
  expect(fragment.get('warp-drive-supabase-type')).toBe('post');
  expect(fragment.get('warp-drive-supabase-count')).toBe(
    expected.count ?? 'exact',
  );
}
