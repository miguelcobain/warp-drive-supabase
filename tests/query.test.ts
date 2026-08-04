import { query } from '../src/builders/query';
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

describe('query builder', () => {
  it('builds a stable read request', () => {
    const request = query('post', {
      include: ['comments', 'author'],
      order: ['start_date.asc'],
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
      order: ['created_at.asc', 'title.desc'],
    });
    const url = new URL(request.url, 'https://example.test');

    expect(url.searchParams.get('select')).toBe('created_at,title');
    expect(url.searchParams.get('order')).toBe('created_at.asc,title.desc');
  });

  it('translates Warp Drive page numbers to PostgREST limit and offset', () => {
    const request = query('post', {
      order: ['created_at.asc'],
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
    void query<PostRecord>('post', { order: ['author.asc'] });

    // @ts-expect-error arbitrary field names are not allowed for typed queries
    void query<PostRecord>('post', { fields: ['published_at'] });

    expect(true).toBe(true);
  });
});
