import type { Type } from '@warp-drive/core/types/symbols';

import {
  findRecord,
  SupabaseTable,
  type SupabaseTableDefinition,
} from '../src/builders';

interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          title: string;
          author_id: string;
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
        Row: { id: string; name: string; active: boolean };
        Insert: {};
        Update: {};
        Relationships: [];
      };
      comments: {
        Row: { id: string; post_id: string; body: string };
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
}

describe('findRecord builder', () => {
  it('builds a singular PostgREST request that selects every field', () => {
    const request = findRecord<Post>('post', '1');
    const url = new URL(request.url, 'https://example.test');

    expect(request.method).toBe('GET');
    expect(request.op).toBe('findRecord');
    expect(request.records).toEqual([{ type: 'post', id: '1' }]);
    expect(url.pathname).toBe('/posts');
    expect(url.searchParams.get('id')).toBe('eq.1');
    expect(url.searchParams.get('select')).toBe('*');
    expect(request.headers.get('Accept')).toBe(
      'application/vnd.pgrst.object+json',
    );
  });

  it('supports typed selections, embeds, child filters, and child ordering', () => {
    const request = findRecord<Post>('post', '1', (q) => {
      q.select(['id', 'title']);
      q.embed(
        'users',
        { as: 'authors', using: 'posts_author_id_fkey' },
        (author) => {
          author.select(['id', 'name']);
          author.where((filter) => filter.eq('active', true));
          author.orderBy('name', { direction: 'asc' });
        },
      );
      q.embed('comments', (comments) => comments.selectAll());
    });
    const url = new URL(request.url, 'https://example.test');

    expect(url.searchParams.get('select')).toBe(
      'id,title,authors:users!posts_author_id_fkey(id,name),comments(*)',
    );
    expect(url.searchParams.get('authors.active')).toBe('eq.true');
    expect(url.searchParams.get('authors.order')).toBe('name.asc');
  });

  it('supports concise complete relationship paths', () => {
    const request = findRecord<Post>('post', '1', (q) => {
      q.selectAll().embedAll(['users', 'comments']);
    });
    const url = new URL(request.url, 'https://example.test');
    expect(url.searchParams.get('select')).toBe('*,users(*),comments(*)');
  });

  it('supports the identifier overload and runs its callback synchronously once', () => {
    const events: string[] = [];
    const request = findRecord<Post>(
      { type: 'post', id: '2' },
      (q) => {
        events.push('configure');
        q.select(['id']);
      },
      { resourcePath: 'articles' },
    );
    events.push('returned');

    expect(events).toEqual(['configure', 'returned']);
    expect(new URL(request.url, 'https://example.test').pathname).toBe(
      '/articles',
    );
  });

  it('accepts arbitrary database strings without an association', () => {
    void findRecord<UnassociatedPost>('post', '1', (q) => {
      q.select(['database_only']);
      q.embed('unknown_relation', {}, (related) => {
        related.select(['unknown_column']);
      });
    });
  });

  it('rejects malformed callbacks and identifiers', () => {
    expect(() => findRecord('post', '1', {} as never)).toThrow(TypeError);
    expect(() => findRecord('post', '', () => {})).toThrow(TypeError);
    expect(() => findRecord('post', '1', async () => {})).toThrow(TypeError);
  });

  it('only exposes singular selection behavior at the root', () => {
    if (false) {
      findRecord<Post>('post', '1', (q) => {
        // @ts-expect-error unknown Row field
        q.select(['createdAt']);
        // @ts-expect-error table is not directly related
        q.embed('missing_table');
        // @ts-expect-error foreign key does not connect posts and users
        q.embed('users', { using: 'wrong_fkey' });
        // @ts-expect-error root filtering belongs to query()
        q.where((filter) => filter.eq('title', 'draft'));
        // @ts-expect-error root ordering is meaningless for one record
        q.orderBy('title');
        // @ts-expect-error root pagination is meaningless for one record
        q.page({ size: 1 });
      });
      // @ts-expect-error legacy options were removed
      findRecord<Post>('post', '1', { include: ['author'] });
    }
    expect(true).toBe(true);
  });
});
