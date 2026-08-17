import { appendPostgrestFilter } from '../src/builders/utils/filter';

function serialize(filter: unknown): URLSearchParams {
  const params = new URLSearchParams();
  appendPostgrestFilter(filter, params);
  return params;
}

describe('PostgREST filter serialization', () => {
  it('serializes compact fields, repeated operators, and nested relationship paths', () => {
    const params = serialize({
      status: { in: ['draft', 'ready,now', 'Quote:"', 'Backslash:\\'] },
      age: { gte: 18, lt: 65 },
      'client_filter.name': { ilike: '*Miguel*' },
    });

    expect(params.get('status')).toBe(
      'in.("draft","ready,now","Quote:\\"","Backslash:\\\\")',
    );
    expect(params.getAll('age')).toEqual(['gte.18', 'lt.65']);
    expect(params.get('client_filter.name')).toBe('ilike."*Miguel*"');
  });

  it('serializes compact nested logic and both negation forms', () => {
    const params = serialize({
      $or: [
        { age: { gte: 18, lte: 65 } },
        {
          $not: {
            $or: [{ active: { is: true } }, { active: { is: 'unknown' } }],
          },
        },
        { client_filter: { not: { is: null } } },
      ],
      $not: { archived: { is: true }, visibility: { eq: 'private' } },
    });

    expect(params.get('or')).toBe(
      '(and(age.gte.18,age.lte.65),not.and(or(active.is.true,active.is.unknown)),client_filter.not.is.null)',
    );
    expect(params.get('not.and')).toBe(
      '(archived.is.true,visibility.eq."private")',
    );
  });

  it('serializes comparison modifiers and every operator family', () => {
    const params = serialize({
      score: {
        eq: { any: [1, 2] },
        neq: 0,
        gt: 1,
        gte: 2,
        lt: 10,
        lte: 9,
        isdistinct: null,
      },
      name: {
        like: { all: ['O*', '*n'] },
        ilike: '*smith*',
        match: '^A',
        imatch: '^b',
      },
      deleted_at: { is: 'not_null' },
      document: {
        fts: { query: 'fat cats', config: 'english' },
        plfts: { query: 'plain words' },
        phfts: { query: 'exact phrase' },
        wfts: { query: 'web -excluded' },
      },
      tags: { cs: ['ember'], cd: [], ov: ['typescript'] },
      metadata: { cs: { priority: 1 } },
      period: {
        sl: '[1,2)',
        sr: '[3,4)',
        nxr: '[5,6)',
        nxl: '[7,8)',
        adj: '[9,10)',
      },
    });

    expect(params.getAll('score')).toEqual([
      'eq(any).{1,2}',
      'neq.0',
      'gt.1',
      'gte.2',
      'lt.10',
      'lte.9',
      'isdistinct.null',
    ]);
    expect(params.getAll('name')).toEqual([
      'like(all).{"O*","*n"}',
      'ilike."*smith*"',
      'match."^A"',
      'imatch."^b"',
    ]);
    expect(params.get('deleted_at')).toBe('is.not_null');
    expect(params.getAll('document')).toEqual([
      'fts(english)."fat cats"',
      'plfts."plain words"',
      'phfts."exact phrase"',
      'wfts."web -excluded"',
    ]);
    expect(params.getAll('tags')).toEqual([
      'cs.{"ember"}',
      'cd.{}',
      'ov.{"typescript"}',
    ]);
    expect(params.get('metadata')).toBe('cs."{\\"priority\\":1}"');
    expect(params.getAll('period')).toEqual([
      'sl."[1,2)"',
      'sr."[3,4)"',
      'nxr."[5,6)"',
      'nxl."[7,8)"',
      'adj."[9,10)"',
    ]);
  });

  it('supports raw filters at the root and inside logical groups', () => {
    const root = serialize({
      $raw: { field: 'metadata->>blood_type', value: 'eq.A-' },
    });
    expect(root.get('metadata->>blood_type')).toBe('eq.A-');

    const nested = serialize({
      $or: [
        { name: { eq: 'Miguel' } },
        { $raw: { field: 'roles.or', value: '(name.eq.admin)' } },
      ],
    });
    expect(nested.get('or')).toBe(
      '(name.eq."Miguel",roles.or.(name.eq.admin))',
    );
  });

  it('omits undefined properties without pruning explicit empty input', () => {
    const params = serialize({
      status: undefined,
      name: { eq: 'Miguel', neq: undefined },
      $or: undefined,
    });
    expect([...params]).toEqual([['name', 'eq."Miguel"']]);

    expect(() => serialize({})).toThrow(RangeError);
    expect(() => serialize({ status: {} })).toThrow(RangeError);
    expect(() => serialize({ status: { eq: undefined } })).toThrow(RangeError);
    expect(() => serialize({ $and: [] })).toThrow(RangeError);
    expect(() => serialize({ $or: [] })).toThrow(RangeError);
    expect(() => serialize({ status: { in: [] } })).toThrow(RangeError);
    expect(() => serialize({ score: { eq: { any: [] } } })).toThrow(RangeError);
  });

  it('rejects malformed operators, full text input, and raw expressions', () => {
    expect(() => serialize({ status: { nope: 'value' } })).toThrow(TypeError);
    expect(() =>
      serialize({ status: { not: { not: { eq: 'value' } } } }),
    ).toThrow(TypeError);
    expect(() => serialize({ score: { eq: { any: [1], all: [2] } } })).toThrow(
      TypeError,
    );
    expect(() => serialize({ body: { fts: { query: '' } } })).toThrow(
      TypeError,
    );
    expect(() =>
      serialize({ body: { fts: { query: 'text', config: 'bad(config)' } } }),
    ).toThrow(TypeError);
    expect(() => serialize({ $raw: { field: '', value: 'eq.x' } })).toThrow(
      RangeError,
    );
    expect(() => serialize({ score: { eq: Number.NaN } })).toThrow(TypeError);
  });
});
