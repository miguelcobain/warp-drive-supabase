import {
  serializeIncludes,
  serializePostgrestFields,
  serializePostgrestOrder,
  serializePostgrestSelect,
} from '../src/builders/utils/query-params';

describe('query param serialization', () => {
  it('serializes nested includes once with stable ordering', () => {
    expect(
      serializeIncludes(['comments.author', 'author', 'comments']),
    ).toEqual(['authors(*)', 'comments(*,authors(*))']);
  });

  it('uses explicit fields when provided', () => {
    expect(
      serializePostgrestSelect(['comments.author'], ['title', 'id', 'title']),
    ).toBe('id,title,comments(*,authors(*))');
  });

  it('preserves order-clause priority while deduplicating', () => {
    expect(
      serializePostgrestOrder([
        { field: 'name', direction: 'asc' },
        { field: 'created_at', direction: 'desc' },
        { field: 'name', direction: 'asc' },
      ]),
    ).toBe('name.asc,created_at.desc');
  });

  it('serializes every structured order modifier and raw clauses', () => {
    expect(
      serializePostgrestOrder([
        { field: 'id' },
        { field: 'name', direction: 'asc' },
        { field: 'rank', nulls: 'first' },
        { field: 'created_at', direction: 'desc', nulls: 'last' },
        { $raw: 'directors(last_name).desc' },
      ]),
    ).toBe(
      'id,name.asc,rank.nullsfirst,created_at.desc.nullslast,directors(last_name).desc',
    );
  });

  it('sorts and deduplicates fields', () => {
    expect(serializePostgrestFields(['name', 'id', 'name'])).toBe('id,name');
  });
});
