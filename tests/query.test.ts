import { query } from '../src/builders/query';

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
    expect(url.searchParams.getAll('status')).toEqual(['eq.published', 'neq.archived']);
    expect(request.headers.get('Accept')).toBe('application/json;charset=utf-8');
  });

  it('keeps field selection narrow when no includes are requested', () => {
    const request = query('post', { fields: ['title', 'id'] });
    const url = new URL(request.url, 'https://example.test');

    expect(url.searchParams.get('select')).toBe('id,title');
  });
});
