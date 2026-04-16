import { serializeToJsonAPI } from '../src/handlers/utils/json-api-serializer';

function createSchemaService() {
  return {
    fields({ type }: { type: string }) {
      if (type === 'post') {
        return new Map([
          ['id', { kind: 'field', name: 'id' }],
          ['title', { kind: 'attribute', name: 'title' }],
          ['createdAt', { kind: 'field', name: 'createdAt', sourceKey: 'created_at' }],
          ['author', { kind: 'resource', name: 'author', type: 'user' }],
          ['comments', { kind: 'collection', name: 'comments', type: 'comment' }],
        ]);
      }

      if (type === 'user') {
        return new Map([
          ['id', { kind: 'field', name: 'id' }],
          ['name', { kind: 'attribute', name: 'name' }],
        ]);
      }

      return new Map([
        ['id', { kind: 'field', name: 'id' }],
        ['body', { kind: 'attribute', name: 'body' }],
        ['author', { kind: 'belongsTo', name: 'author', type: 'user' }],
      ]);
    },
  };
}

describe('serializeToJsonAPI', () => {
  it('serializes attributes and included relationships', () => {
    const schemaService = createSchemaService();
    const document = serializeToJsonAPI(
      schemaService as never,
      {
        id: 1,
        title: 'Post title',
        created_at: '2026-04-15T12:00:00Z',
        author_id: 9,
        authors: {
          id: 9,
          name: 'Ada',
        },
        comments: [
          {
            id: 2,
            body: 'First comment',
            author_id: 9,
            authors: {
              id: 9,
              name: 'Ada',
            },
          },
        ],
      },
      'post'
    );

    expect(document.data).toMatchObject({
      id: '1',
      type: 'post',
      attributes: {
        title: 'Post title',
        created_at: '2026-04-15T12:00:00Z',
      },
      relationships: {
        author: {
          data: {
            id: '9',
            type: 'user',
          },
        },
        comments: {
          data: [{ id: '2', type: 'comment' }],
        },
      },
    });

    expect(document.included).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '9',
          type: 'user',
          attributes: { name: 'Ada' },
        }),
        expect.objectContaining({
          id: '2',
          type: 'comment',
          attributes: { body: 'First comment' },
        }),
      ])
    );
  });

  it('supports null payloads', () => {
    const schemaService = createSchemaService();

    expect(serializeToJsonAPI(schemaService as never, null, 'post')).toEqual({ data: null });
  });

  it('uses sourceKey metadata for field serialization', () => {
    const schemaService = createSchemaService();
    const document = serializeToJsonAPI(
      schemaService as never,
      {
        id: 1,
        title: 'Post title',
        created_at: '2026-04-15T12:00:00Z',
      },
      'post'
    );

    expect(document.data).toMatchObject({
      attributes: {
        created_at: '2026-04-15T12:00:00Z',
      },
    });
  });
});
