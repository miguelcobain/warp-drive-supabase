# warp-drive-supabase

Supabase request builders and handlers for [Warp Drive](https://warp-drive.io/).

The package turns PostgREST and Supabase responses into request payloads that Warp Drive can consume without copying app-local glue into every project.

## Install

```sh
pnpm add warp-drive-supabase @warp-drive/core
```

## What It Exports

Root exports:

- `query`
- `findRecord`
- `createRecord`
- `updateRecord`
- `SupabaseJsonApiHandler`
- `SupabaseUpdatesHandler`
- `createSupabaseAuthHandler`

Subpath exports:

- `warp-drive-supabase/builders`
- `warp-drive-supabase/handlers`
- `warp-drive-supabase/auth`

## Read Path

```ts
import { RequestManager } from '@warp-drive/core';
import Fetch from '@ember-data/request/fetch';
import {
  findRecord,
  query,
  SupabaseJsonApiHandler,
  createSupabaseAuthHandler,
} from 'warp-drive-supabase';

const requestManager = new RequestManager().use([
  createSupabaseAuthHandler({
    apiKey: ENV.supabase.key,
    getAccessToken: async () => {
      const session = await supabase.client.auth.getSession();
      return session.data.session?.access_token ?? null;
    },
  }),
  SupabaseJsonApiHandler,
  Fetch,
]);

store.request(
  query<Post>('post', {
    include: ['comments.author', 'author'],
    order: ['start_date.asc'],
    filter: {
      published_at: 'eq.true',
    },
  })
);

store.request(
  findRecord<User>('user', userId, {
    include: ['organization.properties', 'role'],
  })
);
```

`query` and `findRecord` generate PostgREST-friendly URLs and `SupabaseJsonApiHandler` transforms the JSON response into a JSON:API-shaped document for Warp Drive. The transformer now respects schema `sourceKey` metadata so Polaris-mode ResourceSchemas can map camelCase app fields onto snake_case PostgREST payloads.

## Mutation Support

```ts
import { createRecord, updateRecord, SupabaseUpdatesHandler } from 'warp-drive-supabase';

const requestManager = new RequestManager().use([
  SupabaseUpdatesHandler,
  SupabaseJsonApiHandler,
  Fetch,
]);

const draftPost = store.createRecord('post', {
  title: 'Hello world',
});

await store.request(createRecord(draftPost));
await store.request(updateRecord(post));
```

`SupabaseUpdatesHandler` serializes changed attributes into mutation bodies using schema-aware column names, falling back to underscored keys when no `sourceKey` is present.

## Naming Assumptions

Version `0.1.x` is opinionated:

- Warp Drive resource types are underscored and pluralized to derive table paths.
- Postgres column names are underscored.
- `belongsTo` foreign keys follow the `<relationship>_id` convention.
- Included relation payloads are expected under pluralized relation keys returned by PostgREST.

## Status

Implemented today:

- `query`
- `findRecord`
- `updateRecord`
- `createRecord`
- JSON:API transformation handler
- mutation payload handler
- package-safe Supabase auth handler factory
- Vitest unit coverage
- real Ember consumer coverage in `test-app/`
- MSW-backed Polaris-mode Warp Drive test harness

Not implemented yet:

- pagination helpers
- delete builders
- schema-name customization hooks

## Development

```sh
pnpm install
pnpm typecheck
pnpm test:library
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
pnpm test:all
pnpm build
pnpm smoke:pack
```

Then publish with your normal `pnpm publish` flow.

## Example

There is a minimal consumer setup example in [`examples/basic-store-setup.ts`](examples/basic-store-setup.ts).
