# warp-drive-supabase

Supabase request builders and handlers for [Warp Drive](https://warp-drive.io/).

This package lets a Warp Drive store talk to PostgREST and Supabase with a small, schema-aware request pipeline instead of custom glue in every app.

## Install

```sh
pnpm add warp-drive-supabase @warp-drive/core @warp-drive/utilities
```

If you are using Ember, you will usually also want:

```sh
pnpm add @warp-drive/ember @warp-drive/json-api
```

## Exports

### Builders

These create request configs you pass to `store.request(...)`.

| Export         | Purpose                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `query`        | Build a collection request for a PostgREST table or view               |
| `findRecord`   | Build a single-record request using PostgREST's singular response mode |
| `createRecord` | Build a create mutation from a new Warp Drive record                   |
| `updateRecord` | Build an update mutation from an editable Warp Drive record            |
| `deleteRecord` | Build a delete mutation for a persisted Warp Drive record              |

### Handlers

These are Warp Drive request handlers you add to the store pipeline.

| Export                   | Purpose                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `SupabaseJsonApiHandler` | Transforms raw PostgREST payloads into JSON:API-shaped documents Warp Drive can cache |
| `SupabaseUpdatesHandler` | Serializes changed attributes for create and update requests                          |

### Auth

| Export                             | Purpose                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `createSupabaseAuthHandler`        | Adds `apikey` and optional `Authorization` headers to outgoing requests |
| `CreateSupabaseAuthHandlerOptions` | Type for configuring the auth handler                                   |

### Import Paths

Everything is available from the package root:

```ts
import {
  findRecord,
  query,
  createRecord,
  updateRecord,
  deleteRecord,
  createSupabaseAuthHandler,
  SupabaseJsonApiHandler,
  SupabaseUpdatesHandler,
} from 'warp-drive-supabase';
```

Subpath imports are also available if you prefer them:

```ts
import { query, findRecord } from 'warp-drive-supabase/builders';
import {
  SupabaseJsonApiHandler,
  SupabaseUpdatesHandler,
} from 'warp-drive-supabase/handlers';
import { createSupabaseAuthHandler } from 'warp-drive-supabase/auth';
```

## Recommended Store Setup

This is the shape used by the real Ember consumer app in `test-app/`.

```ts
import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';
import { setBuildURLConfig } from '@warp-drive/utilities';
import {
  SupabaseJsonApiHandler,
  SupabaseUpdatesHandler,
  createSupabaseAuthHandler,
} from 'warp-drive-supabase';

import { RESOURCE_SCHEMAS } from './utils/resource-schemas';

setBuildURLConfig({
  host: ENV.supabase.url.replace(/\/+$/, ''),
  namespace: 'rest/v1',
});

const Store = useRecommendedStore({
  cache: JSONAPICache,
  handlers: [
    createSupabaseAuthHandler({
      apiKey: ENV.supabase.key,
      getAccessToken: async () => {
        const session = await supabase.client.auth.getSession();
        return session.data.session?.access_token ?? null;
      },
    }),
    SupabaseUpdatesHandler,
    SupabaseJsonApiHandler,
  ],
  schemas: RESOURCE_SCHEMAS,
});
```

Call `setBuildURLConfig` once during application setup, before invoking any of the request builders. Every builder will then target the configured Supabase REST endpoint by default; `host`, `namespace`, and `resourcePath` can still be overridden in an individual builder's options.

`SupabaseJsonApiHandler` and `SupabaseUpdatesHandler` are schema-aware. If your Polaris resource schemas use `sourceKey`, the handlers will respect those mappings instead of assuming app field names match database column names.

## Read Example

The builders are meant to be used directly from normal app code.

```gts
import { on } from '@ember/modifier';
import { LinkTo } from '@ember/routing';
import { service } from '@ember/service';

import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';

import { Request } from '@warp-drive/ember';

import type Store from 'my-app/services/store';
import type { Post } from 'my-app/utils/resource-schemas';

import { query } from 'warp-drive-supabase';

export default class PostsPage extends Component {
  @service declare store: Store;

  @cached
  get postsRequest() {
    return this.store.request(
      query<Post>('post', (q) => {
        q.selectAll().embedAll(['authors', 'comments.authors']);
        q.orderBy('created_at', { direction: 'asc' });
        q.page({ size: 20 });
      }),
    );
  }

  <template>
    <Request @request={{this.postsRequest}}>
      <:loading>
        <p>Loading posts…</p>
      </:loading>

      <:error as |error features|>
        <p>{{error.response.status}} {{error.response.statusText}}</p>
        <button type="button" {{on "click" features.retry}}>Retry</button>
      </:error>

      <:content as |document|>
        <ul>
          {{#each document.data as |post|}}
            <li>
              <LinkTo @route="posts.post" @model={{post.id}}>
                {{post.title}}
              </LinkTo>
            </li>
          {{/each}}
        </ul>
      </:content>
    </Request>
  </template>
}
```

For single-record loads:

```ts
const postRequest = store.request(
  findRecord<Post>('post', postId, (q) => {
    q.selectAll().embedAll(['authors', 'comments.authors']);
  }),
);
```

## Selecting and Embedding

A query selects every root column by default. Use `select()` for an explicit column list,
`selectAll()` for an explicit `*`, and `embed()` for related tables. Selection calls append in call
order and ignore exact duplicates.

```ts
query<Post>('post', (q) => {
  q.select(['id', 'title']);

  q.embed(
    'users',
    { as: 'authors', using: 'posts_author_id_fkey', join: 'inner' },
    (author) => author.select(['id', 'name']),
  );

  q.embed('comments', (comments) => {
    comments.selectAll();
  });
});
```

Once an embed is declared, root `*` is no longer implicit. An embed with no selection emits an
empty embed such as `comments()`; call its `selectAll()` method for `comments(*)`. Aliases consumed
by `SupabaseJsonApiHandler` must match the pluralized `sourceKey` (or relationship name) expected
by the Warp Drive schema.

Use `selectRaw()` for trusted JSON paths, spreads, computed relationships, and column expressions.
Raw selections may be combined with either named fields or `selectAll()`.

Generated Supabase views can also be embedded when PostgREST infers their relationship from a base
table foreign key. When generated database types include that inferred relationship, `embed()`
derives its foreign-key hint, row, and cardinality like any table relationship:

```ts
query<Post>('post', (q) => {
  const authorPreview = q
    .embed('user_previews', {
      as: 'author_previews',
      using: 'posts_author_id_fkey',
    })
    .select(['id', 'name']);

  q.where((filter) => filter.ilike(authorPreview, 'name', '*ada*'));
});
```

If a generated view exists but its inferred relationship is absent from the generated metadata,
the same `embed()` call accepts that view with a required `using` hint and explicit `cardinality`.
The hint may name any generated foreign key in the attached schema, which also supports reverse
relationships where the foreign key belongs to the view's underlying table rather than the current
table.
`cardinality` is builder metadata and is not emitted in the PostgREST URL; it controls whether the
returned `EmbedRef` can be used for parent relationship ordering.

The value returned by `embed()` is both a reference and a configurable embedded builder. This
keeps straightforward embeds compact while preserving the same value for related filters and
ordering:

```ts
query<Post>('post', (q) => {
  const author = q
    .embed('users', { as: 'authors', using: 'posts_author_id_fkey' })
    .select(['id', 'name']);

  q.where((filter) => filter.eq(author, 'active', true));
  q.orderBy(author, 'name');
});
```

For relationships where every level should select `*`, use typed relationship paths instead of
declaring each embed callback:

```ts
query<Post>('post', (q) => {
  q.selectAll().embedAll(['authors', 'comments.authors']);
});
```

`embedAll()` merges shared prefixes, preserves path order, and deduplicates repeated paths. Use
`embed()` when an alias, foreign-key hint, join mode, explicit field selection, filter, or order is
needed. Configure its returned reference directly, or pass a callback as the second argument when
no options are required:

```ts
q.embed('comments', (comments) => {
  comments.select(['id', 'body']);
});

q.embed('comments').select(['id', 'body']);
```

`findRecord()` uses the same selection and embed API while retaining singular Warp Drive request
semantics. Its root builder intentionally omits `where()`, `orderBy()`, and `page()` because the
record identifier already determines the root result. Embedded builders still support filtering
and ordering their child rows.

## Filtering

Each `where()` call appends predicates with implicit `AND` semantics. Use `and()`, `or()`, and
`not()` for grouped logic. Optional predicates are ordinary conditional statements.

```ts
query<Post>('post', (q) => {
  q.where((filter) => {
    filter.eq('status', 'published');
    filter.or((either) => {
      either.ilike('title', '*search term*');
      either.ilike('body', '*search term*');
    });
  });
});
```

The methods preserve PostgREST operator names, with `isDistinct()` as the JavaScript spelling for
`isdistinct`. Supported methods are `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`,
`match`, `imatch`, `in`, `is`, `isDistinct`, `fts`, `plfts`, `phfts`, `wfts`, `cs`, `cd`, `ov`,
`sl`, `sr`, `nxr`, `nxl`, and `adj`.

`eq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `match`, and `imatch` accept
`{ quantifier: 'any' | 'all' }`. Full-text methods accept `{ config: string }`:

```ts
query<Post>('post', (q) => {
  q.where((filter) => {
    filter.like('title', ['Warp*', 'Ember*'], { quantifier: 'any' });
    filter.wfts('body', 'typed requests', { config: 'english' });
  });
});
```

Pass the `EmbedRef` returned by `embed()` before the related field:

```ts
query<Post>('post', (q) => {
  const author = q.embed('users', { as: 'authors' });

  q.where((filter) => {
    filter.eq(author, 'active', true);
  });
});
```

Every field operator supports the same form, including quantified and full-text filters:

```ts
filter.ilike(author, 'name', ['Ada*', 'Grace*'], {
  quantifier: 'any',
});
filter.fts(author, 'biography', 'computer science', {
  config: 'english',
});
```

Use `exists()` and `notExists()` for relationship existence predicates. They accept an
`EmbedRef`, including inside logical groups, and serialize to PostgREST's `not.is.null` and
`is.null` embedded-resource filters:

```ts
query<Post>('post', (q) => {
  const author = q.embed('users', { as: 'authors' });

  q.where((filter) => {
    filter.or((either) => {
      either.ilike('title', '*search term*');
      either.exists(author);
    });
  });
});
```

Undefined operands, empty groups, and empty `in`, `any`, or `all` lists are rejected. Use
`filter.raw(field, value)` for trusted JSON/composite paths or future PostgREST syntax.

## Ordering

Call `orderBy()` repeatedly to set priority. A field with no options uses PostgREST's default
ascending order. Identical clauses are deduplicated without changing priority.

```ts
query<Post>('post', (q) => {
  q.orderBy('created_at', { direction: 'desc', nulls: 'last' });
  q.orderBy('id');
});
```

An embedded builder orders its child rows. To order parent rows by a related column, pass a direct
to-one `EmbedRef` to the root builder:

```ts
query<Post>('post', (q) => {
  const author = q.embed('users', { as: 'authors' });

  author.orderBy('name');
  q.orderBy(author, 'name', { direction: 'asc' });
});
```

Use `orderByRaw()` for trusted advanced expressions that are not modeled by the builder.

## Pagination

Pass a one-based page number and page size to `q.page()`. The builder translates these values to
PostgREST `limit` and `offset` parameters and requests an exact count by default.

```ts
const { content: firstPage } = await store.request(
  query<Post>('post', (q) => {
    q.orderBy('created_at', { direction: 'asc' });
    q.page({ number: 1, size: 20 });
  }),
);

firstPage.meta; // { currentPage: 1, totalPages: 5, totalItems: 87 }

const secondPage = await firstPage.next();
const lastPage = await firstPage.last();
```

Paginated documents expose `self`, `first`, `prev`, `next`, and `last` links. Warp Drive uses
these links for `fetch()`, `first()`, `prev()`, `next()`, and `last()`; a navigation method returns
`null` when its corresponding link is unavailable.

The `currentPage` and `totalPages` metadata follow Warp Drive's pagination convention, so the
document can be passed to `<Paginate />` without a custom page-hints adapter. `totalItems` is the
total row count reported by PostgREST's `Content-Range` header.

For large result sets, choose a faster PostgREST count strategy when an exact total is not worth
the database cost:

```ts
query<Post>('post', (q) => {
  q.orderBy('created_at', { direction: 'asc' });
  q.page({ size: 20, count: 'estimated' });
});
```

Supported strategies are `exact`, `planned`, and `estimated`. Page sizes and numbers must be
positive safe integers. Use deterministic `orderBy()` calls whenever rows may be inserted, updated, or
deleted while a user moves between offset-based pages.

## Mutation Example

`createRecord`, `updateRecord`, and `deleteRecord` operate on Warp Drive records, not plain objects.

```gts
import { action } from '@ember/object';
import { service } from '@ember/service';

import Component from '@glimmer/component';

import { checkout } from '@warp-drive/core/reactive';

import type Store from 'my-app/services/store';
import type { EditablePost, Post } from 'my-app/utils/resource-schemas';

import { createRecord, deleteRecord, updateRecord } from 'warp-drive-supabase';

export default class PostEditor extends Component {
  @service declare store: Store;

  @action
  async createPost() {
    const draft = this.store.createRecord<EditablePost>('post', {
      title: 'Created from Warp Drive',
      body: 'Stored through PostgREST',
      createdAt: '2026-04-15T15:00:00Z',
    });

    const result = await this.store.request(createRecord<EditablePost>(draft));
    return result.content.data;
  }

  @action
  async renamePost(post: Post) {
    const editable = await checkout<EditablePost>(post);
    editable.title = 'Updated title';

    const result = await this.store.request(updateRecord<EditablePost>(editable));
    return result.content.data;
  }

  @action
  async removePost(post: Post) {
    await this.store.request(deleteRecord(post));
  }
}
```

`SupabaseUpdatesHandler` serializes changed attributes using schema `sourceKey` values when available, and falls back to underscored field names otherwise.

## TypeScript

Use your Warp Drive resource type as the generic parameter for typed result documents. To also type
the fluent database operations, associate a generated Supabase table with that resource through
the exported `SupabaseTable` symbol and `SupabaseTableDefinition` helper:

```ts
import { Type } from '@warp-drive/core/types/symbols';

import {
  SupabaseTable,
  type SupabaseTableDefinition,
} from 'warp-drive-supabase';

import type { Database } from './database.types';

interface Post {
  [Type]: 'post';
  readonly [SupabaseTable]?: SupabaseTableDefinition<
    Database,
    'public',
    'posts'
  >;

  readonly id: string;
  readonly title: string;
}
```

The symbol property is optional and exists only for TypeScript; resource instances do not need to
contain it. The association supplies the complete database, schema, and table context. `query<Post>()`
and `findRecord<Post>()` then derive exact selections, related tables, foreign-key hints, related
rows, and relationship cardinality from the generated `Row` and `Relationships` metadata. The
collection builder additionally derives filter operands and order columns. Reverse relationships
are discovered by scanning the same schema.

Without the association, the result remains typed as the Warp Drive resource, but fluent database
fields and relationships accept arbitrary strings. The query API deliberately does not guess
database names from Warp Drive schemas.

The configure callback runs synchronously, exactly once, while `query()` constructs the request.
This means tracked properties read inside a callback called from an Ember `@cached` getter are
dependencies of that getter, and changing one invalidates the cached request:

```ts
@cached
get postsRequest() {
  return query<Post>('post', (q) => {
    if (this.status) {
      q.where((filter) => filter.eq('status', this.status));
    }
  });
}
```

Configure, embed, and filter callbacks must be synchronous and return `void`. Paginated query
responses remain typed as Warp Drive reactive documents, while `findRecord<T>()` returns a
single-resource document whose `data` is typed as `T`.

## Naming Assumptions

Version `0.1.x` is opinionated:

- Warp Drive resource types are underscored and pluralized to derive table paths.
- Postgres column names are underscored.
- foreign keys follow the `<relationship>_id` convention.
- included relation payloads are expected under pluralized relation keys returned by PostgREST.

## Status

Implemented today:

- `query`
- `findRecord`
- `createRecord`
- `updateRecord`
- `deleteRecord`
- Supabase auth handler
- JSON:API transformation handler
- mutation payload handler
- schema-aware `sourceKey` support
- PostgREST page-number pagination with Warp Drive document navigation
- Vitest unit coverage
- real Ember consumer coverage in `test-app/`
- MSW-backed Polaris-mode app tests

Not implemented yet:

- schema-name customization hooks

## Development

```sh
pnpm install
pnpm typecheck
pnpm test:library
pnpm --filter test-app lint
pnpm test:app
pnpm test:all
pnpm build
pnpm smoke:pack
pnpm ci:verify
```

`test-app/` is a private Ember app generated from the latest app blueprint and wired in Polaris mode against the workspace source of `warp-drive-supabase`.

`pnpm smoke:pack` creates a tarball, installs it into a temporary consumer, and verifies the published exports can be imported.

## Publishing

Before publishing:

```sh
pnpm typecheck
pnpm test:library
pnpm --filter test-app lint
pnpm test:app
pnpm build
pnpm smoke:pack
```

Then publish with your normal npm or pnpm release flow.

There is also a minimal setup example in [`examples/basic-store-setup.ts`](./examples/basic-store-setup.ts).
