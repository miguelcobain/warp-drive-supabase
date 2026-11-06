import { recordIdentifierFor } from '@warp-drive/core';

import type { Comment, EditablePost, Post, User } from 'test-app/schemas';
import type Store from 'test-app/services/store';
import { setupTest } from 'test-app/tests/helpers';
import {
  HttpResponse,
  POSTS_ENDPOINT,
  http,
  worker,
} from 'test-app/tests/helpers/msw';

import { module, test } from 'qunit';
import { createRecord, query } from 'warp-drive-supabase';

function createLocalRecords(store: Store) {
  const post = store.createRecord<EditablePost>('post', { title: 'Draft' });
  const author = store.createRecord<User>('user', { firstName: 'Ada' });
  const comment = store.createRecord<Comment>('comment', { body: 'Comment' });
  const postKey = recordIdentifierFor(post);
  const authorKey = recordIdentifierFor(author);
  const commentKey = recordIdentifierFor(comment);

  return {
    post,
    identities: [
      { key: postKey, id: '101' },
      { key: authorKey, id: '201' },
      { key: commentKey, id: '301' },
    ],
    payload: {
      id: 101,
      lid: postKey.lid,
      title: 'Draft',
      authors: { id: 201, lid: authorKey.lid, first_name: 'Ada' },
      comments: [{ id: 301, lid: commentKey.lid, body: 'Comment' }],
    },
  };
}

function assertIdentities(
  assert: Assert,
  store: Store,
  identities: ReturnType<typeof createLocalRecords>['identities'],
) {
  for (const { key, id } of identities) {
    assert.strictEqual(key.id, id, `${key.type} receives its server ID`);
    assert.strictEqual(
      store.cacheKeyManager.peekResourceKey({ type: key.type, id }),
      key,
      `${key.type} retains its original identifier`,
    );
    assert.false(store.cache.isNew(key), `${key.type} is now persisted`);
  }
  const postKey = identities[0]!.key;
  assert.strictEqual(
    store.cache.getRemoteRelationship(postKey, 'author').data,
    identities[1]!.key,
    'remote author linkage uses the original identifier',
  );
  assert.deepEqual(
    store.cache.getRemoteRelationship(postKey, 'comments').data,
    [identities[2]!.key],
    'remote comment linkage uses the original identifier',
  );
}

module('Unit | response identity', function (hooks) {
  setupTest(hooks);

  test('read responses associate server IDs with local primary and embedded records', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { post, identities, payload } = createLocalRecords(store);

    worker.use(http.get(POSTS_ENDPOINT, () => HttpResponse.json([payload])));

    const result = await store.request(query<Post>('post'));

    assertIdentities(assert, store, identities);
    assert.strictEqual(
      recordIdentifierFor(result.content.data[0]!),
      recordIdentifierFor(post),
    );
  });

  test('create commits retain embedded identities without sending local IDs as columns', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const { post, identities, payload } = createLocalRecords(store);
    let requestBody: unknown;

    worker.use(
      http.post(POSTS_ENDPOINT, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(payload, { status: 201 });
      }),
    );

    const result = await store.request(createRecord(post));

    assert.deepEqual(
      requestBody,
      { title: 'Draft' },
      'only changed attributes are sent',
    );
    assertIdentities(assert, store, identities);
    assert.strictEqual(
      recordIdentifierFor(result.content.data),
      recordIdentifierFor(post),
    );
    assert.false(
      store.cache.hasChangedAttrs(recordIdentifierFor(post)),
      'the primary commit clears changes',
    );
  });
});
