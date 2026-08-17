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
      query<Post>('post', {
        include: ['author', 'comments.author'],
        order: [{ field: 'created_at', direction: 'asc' }],
        page: { size: 20 },
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
  findRecord<Post>('post', postId, {
    include: ['author', 'comments.author'],
  }),
);
```

## Ordering

Order clauses use structured objects. `direction` may be `asc` or `desc`, and `nulls` may be
`first` or `last`. A bare field uses PostgREST's default ascending order.

```ts
query<Post>('post', {
  order: [
    { field: 'created_at', direction: 'desc', nulls: 'last' },
    { field: 'id' },
  ],
});
```

Advanced PostgREST expressions remain available through an explicit raw clause:

```ts
query<Project>('project', {
  order: [{ $raw: 'directors(last_name).desc' }],
});
```

## Pagination

Pass a one-based page number and page size to `query()`. The builder translates these values to
PostgREST `limit` and `offset` parameters and requests an exact count by default.

```ts
const { content: firstPage } = await store.request(
  query<Post>('post', {
    order: [{ field: 'created_at', direction: 'asc' }],
    page: {
      number: 1,
      size: 20,
    },
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
query<Post>('post', {
  order: [{ field: 'created_at', direction: 'asc' }],
  page: { size: 20, count: 'estimated' },
});
```

Supported strategies are `exact`, `planned`, and `estimated`. Page sizes and numbers must be
positive safe integers. Use a deterministic `order` whenever rows may be inserted, updated, or
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

Use your Warp Drive resource type as the generic parameter for typed builders. Without additional
database metadata, `query<T>()` narrows includes and fields from the resource type and infers likely
Postgres order columns by underscoring its scalar field names.

For exact database typing, associate the generated Supabase table definition with the Warp Drive
resource through the exported `SupabaseTable` symbol:

```ts
import { Type } from '@warp-drive/core/types/symbols';

import { SupabaseTable } from 'warp-drive-supabase';

import type { Database } from './database.types';

interface Project {
  [Type]: 'project';
  readonly [SupabaseTable]?: Database['public']['Tables']['projects'];

  readonly id: string;
  readonly createdAt: string;
}
```

The symbol property is optional and exists only for TypeScript; resource instances do not need to
contain it. When the association is present, `query<Project>()` derives order fields from the exact
keys of `Database['public']['Tables']['projects']['Row']`. Those generated keys replace fallback
guesses, so database-only columns are accepted while incorrect or camel-cased guesses are rejected.

The complete table definition is associated instead of only `Row`, retaining Supabase's `Insert`,
`Update`, and `Relationships` metadata for additional progressive typing. Paginated query responses
remain typed as Warp Drive reactive documents, and `findRecord<T>()` returns a single-resource
document whose `data` is typed as `T`.

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
