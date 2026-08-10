import {
  serializeIncludes,
  serializePostgrestFields,
  serializePostgrestOrder,
  serializePostgrestSelect,
} from '../src/builders/utils/query-params';

describe('query param serialization', () => {
  it('serializes nested includes once with stable ordering', () => {
    expect(serializeIncludes(['comments.author', 'author', 'comments'])).toEqual([
      'authors(*)',
      'comments(*,authors(*))',
    ]);
  });

  it('uses explicit fields when provided', () => {
    expect(serializePostgrestSelect(['comments.author'], ['title', 'id', 'title'])).toBe(
      'id,title,comments(*,authors(*))'
    );
  });

  it('preserves order-clause priority while deduplicating', () => {
    expect(serializePostgrestOrder(['name.asc', 'created_at.desc', 'name.asc'])).toBe(
      'name.asc,created_at.desc'
    );
  });

  it('sorts and deduplicates fields', () => {
    expect(serializePostgrestFields(['name', 'id', 'name'])).toBe('id,name');
  });
});
