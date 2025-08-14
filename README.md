# warp-drive-supabase

## Usage

Setup the store

```ts
// app/services/store.ts
import { assert } from '@ember/debug';
import { setOwner, getOwner } from '@ember/owner';

import Store, { CacheHandler } from '@ember-data/store';
import Fetch from '@ember-data/request/fetch';
import SupabaseJsonApiHandler from 'my-app/handlers/postgrest-json-api';
import SupabaseAuthHandler from 'my-app/handlers/supabase-auth';

export default class AppStore extends Store {
  constructor(object: object) {
    super(object);

    let owner = getOwner(object);
    assert('AppStore must be instantiated with an owner', owner && owner instanceof ApplicationInstance);
    setOwner(this, owner);

    let supabaseAuthHandler = new SupabaseAuthHandler();
    setOwner(supabaseAuthHandler, owner);

    this.requestManager = new RequestManager()
      .use([supabaseAuthHandler, SupabaseJsonApiHandler, Fetch])
      .useCache(CacheHandler);
  }

```

`query` builder

```ts
store.request(query<Post>('post', {
  include: ['comments', 'author'] // these includes are typed!
  order: ['start_date.asc'],
  filter: {
    date: 'gte.2023-10-01T00:00:00Z', // can also be an array to apply multiple conditions to the same column
  },
}))
```

`findRecord` builder

```ts
store.request(findRecord<User>('user', userId, {
  include: ['role', 'organization.properties'] // these includes are typed!
}));
```

## Notes

- I only tried this setup with `@ember-data/model`, but it shouldn't be difficult to adapt the handler to use SchemaRecord
- everything assumes that the postgres tables are *underscored* and *pluralized* and that the columns are *underscored* (a fairly common standard)
- The SupabaseAuthHanlder assumes an existing supabase service where you initialize the supabase client and expose it
- Lots of things missing (pagination, create/update builders, testing, etc)