import { serializeToJsonAPI } from '../src/handlers/utils/json-api-serializer';

function createSchemaService() {
  return {
    fields({ type }: { type: string }) {
      if (type === 'project') {
        return new Map([
          ['id', { kind: 'field', name: 'id' }],
          ['organization', { kind: 'belongsTo', name: 'organization', type: 'organization' }],
        ]);
      }

      if (type === 'organization') {
        return new Map([
          ['id', { kind: 'field', name: 'id' }],
          ['name', { kind: 'attribute', name: 'name' }],
          ['owner', { kind: 'resource', name: 'owner', type: 'user' }],
        ]);
      }

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
  it.each([true, false])(
    'keeps ID-only belongs-to embeds as linkage (foreign key selected: %s)',
    (hasForeignKey) => {
      const document = serializeToJsonAPI(
        createSchemaService() as never,
        {
          id: 'project-1',
          ...(hasForeignKey ? { organization_id: 'organization-1' } : {}),
          organizations: { id: 'organization-1' },
        },
        'project'
      );

      expect(document).toEqual({
        data: {
          id: 'project-1',
          type: 'project',
          attributes: {},
          relationships: {
            organization: { data: { type: 'organization', id: 'organization-1' } },
          },
        },
      });
      expect(document).not.toHaveProperty('included');
    }
  );

  it.each(['Example Organization', null])(
    'includes belongs-to embeds with a selected attribute valued %s',
    (name) => {
      const document = serializeToJsonAPI(
        createSchemaService() as never,
        {
          id: 'project-1',
          organizations: { id: 'organization-1', name },
        },
        'project'
      );

      expect(document.data).toMatchObject({
        relationships: {
          organization: { data: { type: 'organization', id: 'organization-1' } },
        },
      });
      expect(document.included).toEqual([
        {
          id: 'organization-1',
          type: 'organization',
          attributes: { name },
          relationships: {},
        },
      ]);
    }
  );

  it('includes belongs-to embeds with relationships but no attributes', () => {
    const document = serializeToJsonAPI(
      createSchemaService() as never,
      {
        id: 'project-1',
        organizations: {
          id: 'organization-1',
          owners: { id: 'user-1' },
        },
      },
      'project'
    );

    expect(document.included).toEqual([
      {
        id: 'organization-1',
        type: 'organization',
        attributes: {},
        relationships: {
          owner: { data: { type: 'user', id: 'user-1' } },
        },
      },
    ]);
  });

  it('includes a populated embed after an ID-only embed of the same record', () => {
    const document = serializeToJsonAPI(
      createSchemaService() as never,
      [
        { id: 'project-1', organizations: { id: 'organization-1' } },
        {
          id: 'project-2',
          organizations: { id: 'organization-1', name: 'Example Organization' },
        },
      ],
      'project'
    );

    expect(document.data).toEqual([
      expect.objectContaining({
        id: 'project-1',
        relationships: {
          organization: { data: { type: 'organization', id: 'organization-1' } },
        },
      }),
      expect.objectContaining({
        id: 'project-2',
        relationships: {
          organization: { data: { type: 'organization', id: 'organization-1' } },
        },
      }),
    ]);
    expect(document.included).toEqual([
      {
        id: 'organization-1',
        type: 'organization',
        attributes: { name: 'Example Organization' },
        relationships: {},
      },
    ]);
  });

  it('preserves null belongs-to embeds', () => {
    const document = serializeToJsonAPI(
      createSchemaService() as never,
      { id: 'project-1', organizations: null },
      'project'
    );

    expect(document.data).toMatchObject({
      relationships: { organization: { data: null } },
    });
    expect(document).not.toHaveProperty('included');
  });

  it('preserves empty to-many embeds', () => {
    const document = serializeToJsonAPI(
      createSchemaService() as never,
      { id: 'post-1', comments: [] },
      'post'
    );

    expect(document.data).toMatchObject({
      relationships: { comments: { data: [] } },
    });
    expect(document).not.toHaveProperty('included');
  });

  it('keeps ID-only to-many embeds as linkage', () => {
    const document = serializeToJsonAPI(
      createSchemaService() as never,
      { id: 'post-1', comments: [{ id: 'comment-1' }] },
      'post'
    );

    expect(document.data).toMatchObject({
      relationships: {
        comments: { data: [{ type: 'comment', id: 'comment-1' }] },
      },
    });
    expect(document).not.toHaveProperty('included');
  });

  it('includes only populated rows from a mixed to-many embed', () => {
    const document = serializeToJsonAPI(
      createSchemaService() as never,
      {
        id: 'post-1',
        comments: [
          { id: 'comment-1' },
          { id: 'comment-2', body: 'Example comment' },
          { id: 'comment-3', authors: { id: 'user-1' } },
        ],
      },
      'post'
    );

    expect(document.data).toMatchObject({
      relationships: {
        comments: {
          data: [
            { type: 'comment', id: 'comment-1' },
            { type: 'comment', id: 'comment-2' },
            { type: 'comment', id: 'comment-3' },
          ],
        },
      },
    });
    expect(document.included).toEqual([
      {
        id: 'comment-2',
        type: 'comment',
        attributes: { body: 'Example comment' },
        relationships: {},
      },
      {
        id: 'comment-3',
        type: 'comment',
        attributes: {},
        relationships: {
          author: { data: { type: 'user', id: 'user-1' } },
        },
      },
    ]);
  });

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

  it('omits unselected to-one relationships from partial records', () => {
    const schemaService = createSchemaService();
    const document = serializeToJsonAPI(
      schemaService as never,
      {
        id: 1,
        title: 'Post title',
      },
      'post'
    );

    expect(document.data).toMatchObject({
      id: '1',
      type: 'post',
      relationships: {},
    });
  });

  it('preserves explicitly selected null to-one relationships', () => {
    const schemaService = createSchemaService();
    const document = serializeToJsonAPI(
      schemaService as never,
      {
        id: 1,
        author_id: null,
      },
      'post'
    );

    expect(document.data).toMatchObject({
      relationships: {
        author: {
          data: null,
        },
      },
    });
  });

  it('derives to-one linkage from an embed when the foreign key is unselected', () => {
    const schemaService = createSchemaService();
    const document = serializeToJsonAPI(
      schemaService as never,
      {
        id: 1,
        authors: {
          id: 9,
          name: 'Ada',
        },
      },
      'post'
    );

    expect(document.data).toMatchObject({
      relationships: {
        author: {
          data: {
            id: '9',
            type: 'user',
          },
        },
      },
    });
    expect(document.included).toEqual([
      expect.objectContaining({
        id: '9',
        type: 'user',
        attributes: { name: 'Ada' },
      }),
    ]);
  });
});
