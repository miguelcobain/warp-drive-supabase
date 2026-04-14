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

  it('sorts and deduplicates order clauses', () => {
    expect(serializePostgrestOrder(['created_at.desc', 'name.asc', 'created_at.desc'])).toBe(
      'created_at.desc,name.asc'
    );
  });

  it('sorts and deduplicates fields', () => {
    expect(serializePostgrestFields(['name', 'id', 'name'])).toBe('id,name');
  });
});
