import {
  query,
  SupabaseTable,
  type EmbedRef,
  type SupabaseTableDefinition,
} from '../src/builders';
import type { Type } from '@warp-drive/core/types/symbols';

interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          title: string;
          body: string;
          status: 'draft' | 'published';
          created_at: string;
          author_id: string | null;
          score: number;
          active: boolean;
          tags: string[];
          metadata: { priority: number } | null;
        };
        Insert: {};
        Update: {};
        Relationships: [
          {
            foreignKeyName: 'posts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          name: string;
          biography: string;
          active: boolean;
          tags: string[];
          created_at: string;
        };
        Insert: {};
        Update: {};
        Relationships: [];
      };
      comments: {
        Row: { id: string; post_id: string; user_id: string; body: string };
        Insert: {};
        Update: {};
        Relationships: [
          {
            foreignKeyName: 'comments_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
  };
}

interface Post {
  [Type]: 'post';
  readonly [SupabaseTable]?: SupabaseTableDefinition<
    Database,
    'public',
    'posts'
  >;
  id: string;
  title: string;
}

interface UnassociatedPost {
  [Type]: 'post';
  id: string;
  createdAt: string;
}

describe('fluent query builder', () => {
  it('defaults to selecting every root field', () => {
    const request = query<Post>('post');
    const url = new URL(request.url, 'https://example.test');
    expect(url.pathname).toBe('/posts');
    expect(url.searchParams.get('select')).toBe('*');
    expect(request.method).toBe('GET');
  });

  it('runs the configure callback synchronously exactly once', () => {
    const events: string[] = [];
    query<Post>('post', (q) => {
      events.push('configure');
      q.select(['id']);
    });
    events.push('returned');
    expect(events).toEqual(['configure', 'returned']);
  });

  it('builds selections, embeds, filters, ordering, and pagination', () => {
    const request = query<Post>('post', (q) => {
      q.select(['id', 'title', 'status']);
      const author = q.embed(
        'users',
        { as: 'authors', using: 'posts_author_id_fkey', join: 'inner' },
        (user) => {
          user.select(['id', 'name']);
          user.where((f) => f.eq('active', true));
          user.orderBy('name', { direction: 'asc' });
        },
      );
      q.where((f) => {
        f.eq('status', 'published');
        f.or((or) => {
          or.ilike('title', '*search*');
          or.ilike(author, 'name', '*search*');
        });
      });
      q.orderBy('created_at', { direction: 'desc', nulls: 'last' });
      q.orderBy(author, 'name', { direction: 'asc' });
      q.page({ size: 20, number: 2, count: 'estimated' });
    });
    const url = new URL(request.url, 'https://example.test');

    expect(url.searchParams.get('select')).toBe(
      'id,title,status,authors:users!posts_author_id_fkey!inner(id,name)',
    );
    expect(url.searchParams.get('status')).toBe('eq."published"');
    expect(url.searchParams.get('or')).toBe(
      '(title.ilike."*search*",authors.name.ilike."*search*")',
    );
    expect(url.searchParams.get('authors.active')).toBe('eq.true');
    expect(url.searchParams.get('authors.order')).toBe('name.asc');
    expect(url.searchParams.get('order')).toBe(
      'created_at.desc.nullslast,authors(name).asc',
    );
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('offset')).toBe('20');
    expect(request.headers.get('Prefer')).toBe('count=estimated');
  });

  it('supports reverse and nested embeds, scoped filters, and raw selections', () => {
    const request = query<Post>('post', (q) => {
      q.selectRaw('metadata->>priority');
      q.embed('comments', {}, (comments) => {
        const commenter = comments.embed('users', { as: 'commenter' });
        comments.where((filter) => {
          filter.or((either) => {
            either.ilike('body', '*search*');
            either.ilike(commenter, 'name', '*search*');
          });
        });
      });
    });
    const url = new URL(request.url, 'https://example.test');
    expect(url.searchParams.get('select')).toBe(
      'metadata->>priority,comments(commenter:users())',
    );
    expect(url.searchParams.get('comments.or')).toBe(
      '(body.ilike."*search*",commenter.name.ilike."*search*")',
    );
  });

  it('allows raw selections alongside an explicit wildcard', () => {
    const request = query<Post>('post', (q) => {
      q.selectAll();
      q.selectRaw('metadata->>priority');
    });
    const url = new URL(request.url, 'https://example.test');
    expect(url.searchParams.get('select')).toBe('*,metadata->>priority');
  });

  it('selects and merges complete relationship paths with embedAll', () => {
    const request = query<Post>('post', (q) => {
      q.selectAll().embedAll([
        'comments.users',
        'users',
        'comments',
        'comments.users',
      ]);
    });
    const url = new URL(request.url, 'https://example.test');
    expect(url.searchParams.get('select')).toBe(
      '*,comments(*,users(*)),users(*)',
    );
  });

  it('allows embed callbacks without an empty options object', () => {
    const request = query<Post>('post', (q) => {
      q.embed('comments', (comments) => comments.select(['id']));
    });
    const url = new URL(request.url, 'https://example.test');
    expect(url.searchParams.get('select')).toBe('comments(id)');
  });

  it('returns a configurable embed reference', () => {
    const request = query<Post>('post', (q) => {
      const author = q
        .embed('users', {
          as: 'authors',
          using: 'posts_author_id_fkey',
        })
        .select(['id', 'name'])
        .where((filter) => filter.eq('active', true))
        .orderBy('name');

      q.where((filter) => filter.ilike(author, 'name', 'A*'));
      q.orderBy(author, 'created_at', { direction: 'desc' });

      q.embed('comments')
        .selectAll()
        .embed('users', { as: 'commenters' })
        .select(['id', 'name']);
    });
    const url = new URL(request.url, 'https://example.test');

    expect(url.searchParams.get('select')).toBe(
      'authors:users!posts_author_id_fkey(id,name),comments(*,commenters:users(id,name))',
    );
    expect(url.searchParams.get('authors.active')).toBe('eq.true');
    expect(url.searchParams.get('authors.name')).toBe('ilike."A*"');
    expect(url.searchParams.get('authors.order')).toBe('name');
    expect(url.searchParams.get('order')).toBe('authors(created_at).desc');
  });

  it('preserves selection call order and deduplicates across methods', () => {
    const request = query<Post>('post', (q) => {
      q.select(['id']);
      q.selectRaw('metadata->>priority');
      q.embed('comments');
      q.select(['title']);
      q.selectRaw('id');
    });
    const url = new URL(request.url, 'https://example.test');
    expect(url.searchParams.get('select')).toBe(
      'id,metadata->>priority,comments(),title',
    );
  });

  it('serializes every order modifier and the raw escape hatch', () => {
    const request = query<Post>('post', (q) => {
      q.orderBy('id');
      q.orderBy('title', { direction: 'desc' });
      q.orderBy('status', { nulls: 'first' });
      q.orderBy('created_at', { direction: 'asc', nulls: 'last' });
      q.orderByRaw('metadata->priority.desc');
    });
    const url = new URL(request.url, 'https://example.test');
    expect(url.searchParams.get('order')).toBe(
      'id,title.desc,status.nullsfirst,created_at.asc.nullslast,metadata->priority.desc',
    );
  });

  it('deduplicates selections and orders while preserving priority', () => {
    const request = query<Post>('post', (q) => {
      q.select(['title', 'id']);
      q.select(['title']);
      q.orderBy('status');
      q.orderBy('created_at', { direction: 'desc' });
      q.orderBy('status');
    });
    const url = new URL(request.url, 'https://example.test');
    expect(url.searchParams.get('select')).toBe('title,id');
    expect(url.searchParams.get('order')).toBe('status,created_at.desc');
  });

  it('supports all filter families and logical grouping', () => {
    const request = query<Post>('post', (q) => {
      q.where((f) => {
        f.eq('score', [10, 20], { quantifier: 'any' });
        f.neq('status', 'draft');
        f.gt('score', 0).gte('score', 10).lt('score', 100).lte('score', 90);
        f.in('status', ['draft', 'published']);
        f.is('active', true);
        f.isDistinct('metadata', null);
        f.like('title', 'Warp*');
        f.ilike('body', ['*ember*', '*warp*'], { quantifier: 'all' });
        f.match('title', '^Warp').imatch('body', 'drive$');
        f.fts('body', 'warp', { config: 'english' });
        f.plfts('body', 'warp drive')
          .phfts('body', 'warp drive')
          .wfts('body', 'warp -speed');
        f.cs('tags', ['ember'])
          .cd('tags', ['ember', 'warp'])
          .ov('tags', ['warp']);
        f.sl('created_at', '2027-01-01').sr('created_at', '2025-01-01');
        f.nxr('created_at', '2026-01-01')
          .nxl('created_at', '2026-01-01')
          .adj('created_at', '2026-01-01');
        f.not((not) => not.eq('status', 'draft'));
        f.raw('metadata->>priority', 'eq.high');
      });
    });
    const url = new URL(request.url, 'https://example.test');
    expect(url.searchParams.getAll('score')).toEqual([
      'eq(any).{10,20}',
      'gt.0',
      'gte.10',
      'lt.100',
      'lte.90',
    ]);
    expect(url.searchParams.getAll('body')).toContain('fts(english)."warp"');
    expect(url.searchParams.get('not.and')).toBe('(status.eq."draft")');
    expect(url.searchParams.get('metadata->>priority')).toBe('eq.high');
  });

  it('accepts embed references directly in every filter family', () => {
    const request = query<Post>('post', (q) => {
      const author = q.embed('users', { as: 'authors' });
      q.where((filter) => {
        filter.eq(author, 'name', 'Ada');
        filter.eq(author, 'name', ['Ada', 'Grace'], { quantifier: 'any' });
        filter.neq(author, 'active', false);
        filter.gt(author, 'created_at', '2025-01-01');
        filter.ilike(author, 'name', ['A*', 'G*'], { quantifier: 'any' });
        filter.fts(author, 'biography', 'computer science', {
          config: 'english',
        });
        filter.in(author, 'name', ['Ada', 'Grace']);
        filter.is(author, 'active', true);
        filter.isDistinct(author, 'name', 'Grace');
        filter.cs(author, 'tags', ['engineering']);
        filter.sl(author, 'created_at', '2027-01-01');
        filter.raw(author, 'metadata->>priority', 'eq.high');
      });
    });
    const url = new URL(request.url, 'https://example.test');

    expect(url.searchParams.getAll('authors.name')).toEqual([
      'eq."Ada"',
      'eq(any).{"Ada","Grace"}',
      'ilike(any).{"A*","G*"}',
      'in.("Ada","Grace")',
      'isdistinct."Grace"',
    ]);
    expect(url.searchParams.get('authors.active')).toBe('neq.false');
    expect(url.searchParams.get('authors.biography')).toBe(
      'fts(english)."computer science"',
    );
    expect(url.searchParams.get('authors.tags')).toBe('cs.{"engineering"}');
    expect(url.searchParams.get('authors.metadata->>priority')).toBe('eq.high');
  });

  it('allows arbitrary database strings without an association', () => {
    void query<UnassociatedPost>('post', (q) => {
      q.select(['database_only']);
      q.where((f) => f.eq('unknown_column', 'value'));
      q.orderBy('anything');
      q.embed('unknown_relation', { as: 'related' });
    });
  });

  it('rejects malformed callbacks and builder input', () => {
    expect(() => query('post', {} as never)).toThrow(TypeError);
    expect(() => query('post', async () => {})).toThrow(TypeError);
    expect(() => query('post', (q) => q.select([]))).toThrow(RangeError);
    expect(() => query('post', (q) => q.embedAll([]))).toThrow(RangeError);
    expect(() => query('post', (q) => q.embedAll(['comments..users']))).toThrow(
      RangeError,
    );
    expect(() =>
      query('post', (q) => {
        q.selectAll();
        q.select(['id']);
      }),
    ).toThrow(TypeError);
    expect(() => query('post', (q) => q.where(() => {}))).toThrow(RangeError);
    expect(() => query('post', (q) => q.where((f) => f.in('id', [])))).toThrow(
      RangeError,
    );
    expect(() =>
      query('post', (q) => q.where((f) => f.fts('body', ''))),
    ).toThrow(RangeError);
    expect(() => query('post', (q) => q.page({ size: 0 }))).toThrow(RangeError);
    expect(() =>
      query('post', (q) => q.orderBy('id', { direction: 'sideways' as never })),
    ).toThrow(RangeError);
  });

  it('rejects embed references from another query', () => {
    let author!: EmbedRef;
    query('post', (q) => {
      author = q.embed('users');
    });
    expect(() =>
      query('post', (q) =>
        q.orderBy(author as EmbedRef<any, 'one', string, true>, 'name'),
      ),
    ).toThrow(TypeError);
    expect(() =>
      query('post', (q) =>
        q.where((filter) => filter.eq(author, 'name', 'Ada')),
      ),
    ).toThrow(TypeError);
  });

  it('enforces Supabase columns, values, relationships, and cardinality', () => {
    if (false) {
      query<Post>('post', (q) => {
        // @ts-expect-error unknown Row field
        q.select(['createdAt']);
        // @ts-expect-error unknown Row field
        q.orderBy('missing');
        // @ts-expect-error invalid order direction
        q.orderBy('id', { direction: 'sideways' });
        // @ts-expect-error invalid null placement
        q.orderBy('id', { nulls: 'middle' });
        // @ts-expect-error legacy string order clauses are not callbacks
        query<Post>('post', ['created_at.desc']);
        q.where((f) => {
          // @ts-expect-error generated enum value is invalid
          f.eq('status', 'archived');
          // @ts-expect-error pattern filters require string fields
          f.ilike('score', '*10*');
          // @ts-expect-error full-text filters require string or object fields
          f.fts('score', '10');
        });
        const author = q.embed('users');
        q.where((f) => {
          f.eq(author, 'active', true);
          // @ts-expect-error unknown related Row field
          f.eq(author, 'missing', true);
          // @ts-expect-error related operand must match the generated Row
          f.eq(author, 'active', 'yes');
          // @ts-expect-error related() was removed in favor of EmbedRef-first operators
          f.related(author);
        });
        // @ts-expect-error table is not directly related
        q.embed('missing_table');
        // @ts-expect-error relationship path is not present in generated metadata
        q.embedAll(['comments.missing_table']);
        // @ts-expect-error foreign key does not connect posts and users
        q.embed('users', { using: 'wrong_fkey' });
        const comments = q.embed('comments');
        // @ts-expect-error parent ordering requires a to-one relationship
        q.orderBy(comments, 'body');
        q.embed('users', {}, (usersOne) => {
          usersOne.embed('posts', {}, (postsTwo) => {
            postsTwo.embed('users', {}, (usersThree) => {
              usersThree.embed('posts', {}, (postsFour) => {
                postsFour.embed('users', {}, (usersFive) => {
                  // @ts-expect-error relationship typing stops after five hops
                  usersFive.embed('posts');
                });
              });
            });
          });
        });
      });
      // @ts-expect-error legacy options were removed
      query<Post>('post', { fields: ['id'] });
      // @ts-expect-error legacy filters were removed
      query<Post>('post', { filter: { status: { eq: 'published' } } });
    }
    expect(true).toBe(true);
  });
});
