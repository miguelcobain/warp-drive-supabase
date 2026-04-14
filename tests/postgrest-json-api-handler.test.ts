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
      next as never
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
      next as never
    );

    expect(result).toBe(response);
  });
});
