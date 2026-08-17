import { query, SupabaseTable } from '../src/builders';
import type { Type } from '@warp-drive/core/types/symbols';

interface AuthorRecord {
  [Type]: 'author';
  id: string;
  firstName: string;
}

interface CommentRecord {
  [Type]: 'comment';
  id: string;
  body: string;
  author: AuthorRecord | null;
}

interface PostRecord {
  [Type]: 'post';
  id: string;
  title: string;
  createdAt: string;
  author: AuthorRecord | null;
  comments: CommentRecord[];
}

interface PostTableDefinition {
  Row: {
    id: string;
    title: string;
    published_at: string;
    metadata: { priority: number } | null;
  };
  Insert: {
    id?: string;
    title: string;
    published_at: string;
    metadata?: { priority: number } | null;
  };
  Update: {
    title?: string;
    published_at?: string;
    metadata?: { priority: number } | null;
  };
  Relationships: [];
}

interface AssociatedPostRecord {
  [Type]: 'post';
  readonly [SupabaseTable]?: PostTableDefinition;
  id: string;
  title: string;
  createdAt: string;
}

describe('query builder', () => {
  it('builds a stable read request', () => {
    const request = query('post', {
      include: ['comments', 'author'],
      order: [{ field: 'start_date', direction: 'asc' }],
      filter: {
        date: 'gte.2023-10-01T00:00:00Z',
        status: ['eq.published', 'neq.archived'],
      },
    });

    const url = new URL(request.url, 'https://example.test');

    expect(request.method).toBe('GET');
    expect(request.op).toBe('query');
    expect(url.pathname).toBe('/posts');
    expect(url.searchParams.get('select')).toBe('*,authors(*),comments(*)');
    expect(url.searchParams.get('order')).toBe('start_date.asc');
    expect(url.searchParams.get('date')).toBe('gte.2023-10-01T00:00:00Z');
    expect(url.searchParams.getAll('status')).toEqual([
      'eq.published',
      'neq.archived',
    ]);
    expect(request.headers.get('Accept')).toBe(
      'application/json;charset=utf-8',
    );
  });

  it('keeps field selection narrow when no includes are requested', () => {
    const request = query('post', { fields: ['title', 'id'] });
    const url = new URL(request.url, 'https://example.test');

    expect(url.searchParams.get('select')).toBe('id,title');
  });

  it('accepts typed field and order names for scalar fields', () => {
    const request = query<PostRecord>('post', {
      fields: ['created_at', 'title'],
      order: [
        { field: 'created_at', direction: 'asc' },
        { field: 'title', direction: 'desc' },
      ],
    });
    const url = new URL(request.url, 'https://example.test');

    expect(url.searchParams.get('select')).toBe('created_at,title');
    expect(url.searchParams.get('order')).toBe('created_at.asc,title.desc');
  });

  it('translates Warp Drive page numbers to PostgREST limit and offset', () => {
    const request = query('post', {
      order: [{ field: 'created_at', direction: 'asc' }],
      filter: { limit: '999', offset: '999' },
      page: { size: 25, number: 3 },
    });
    const url = new URL(request.url, 'https://example.test');

    expect(url.searchParams.get('limit')).toBe('25');
    expect(url.searchParams.get('offset')).toBe('50');
    expect(url.searchParams.getAll('limit')).toEqual(['25']);
    expect(url.searchParams.getAll('offset')).toEqual(['50']);
    expect(request.headers.get('Prefer')).toBe('count=exact');
    expect(request.options).toEqual({
      type: 'post',
      postgrestPagination: { count: 'exact' },
    });
  });

  it('defaults to the first page and supports alternate PostgREST count modes', () => {
    const request = query('post', {
      page: { size: 10, count: 'estimated' },
    });
    const url = new URL(request.url, 'https://example.test');

    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('offset')).toBe('0');
    expect(request.headers.get('Prefer')).toBe('count=estimated');
  });

  it('rejects invalid page values', () => {
    expect(() => query('post', { page: { size: 0 } })).toThrow(RangeError);
    expect(() => query('post', { page: { size: 10.5 } })).toThrow(RangeError);
    expect(() => query('post', { page: { size: 10, number: -1 } })).toThrow(
      RangeError,
    );
    expect(() =>
      query('post', { page: { size: Number.MAX_SAFE_INTEGER, number: 3 } }),
    ).toThrow(RangeError);
    expect(() =>
      // @ts-expect-error unsupported count modes are rejected at runtime too
      query('post', { page: { size: 10, count: 'fast' } }),
    ).toThrow(RangeError);
  });

  it('rejects non-scalar typed field and order names at compile time', () => {
    // @ts-expect-error relation fields are not valid scalar field selections
    void query<PostRecord>('post', { fields: ['comments'] });

    // @ts-expect-error relation fields are not valid scalar order clauses
    void query<PostRecord>('post', { order: [{ field: 'author' }] });

    // @ts-expect-error arbitrary field names are not allowed for typed queries
    void query<PostRecord>('post', { fields: ['published_at'] });

    expect(true).toBe(true);
  });

  it('progressively enhances order fields from attached Supabase metadata', () => {
    const request = query<AssociatedPostRecord>('post', {
      order: [
        { field: 'published_at', direction: 'desc', nulls: 'last' },
        { field: 'metadata' },
        { $raw: 'directors(last_name).desc' },
      ],
    });

    const url = new URL(request.url, 'https://example.test');
    expect(url.searchParams.get('order')).toBe(
      'published_at.desc.nullslast,metadata,directors(last_name).desc',
    );

    if (false) {
      void query<AssociatedPostRecord>('post', {
        // @ts-expect-error attached Row keys replace fallback Warp Drive guesses
        order: [{ field: 'created_at' }],
      });

      void query<AssociatedPostRecord>('post', {
        // @ts-expect-error unknown fields are rejected for associated records
        order: [{ field: 'missing' }],
      });

      // @ts-expect-error legacy string clauses are no longer accepted
      void query<AssociatedPostRecord>('post', { order: ['title.asc'] });

      void query<AssociatedPostRecord>('post', {
        // @ts-expect-error directions are limited to PostgREST values
        order: [{ field: 'title', direction: 'ascending' }],
      });

      void query<AssociatedPostRecord>('post', {
        // @ts-expect-error null placement uses first or last
        order: [{ field: 'title', nulls: 'middle' }],
      });

      void query<AssociatedPostRecord>('post', {
        // @ts-expect-error structured clauses require a field or $raw
        order: [{ direction: 'asc' }],
      });

      void query<AssociatedPostRecord>('post', {
        // @ts-expect-error raw and structured order clauses are mutually exclusive
        order: [{ field: 'title', $raw: 'title.desc' }],
      });
    }
  });

  it('allows arbitrary structured order fields for untyped queries', () => {
    const request = query('post', {
      order: [{ field: 'custom_database_column', direction: 'desc' }],
    });

    const url = new URL(request.url, 'https://example.test');
    expect(url.searchParams.get('order')).toBe('custom_database_column.desc');
  });
});
