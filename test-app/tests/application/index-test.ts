import { currentURL, visit, waitFor } from '@ember/test-helpers';

import type Store from 'test-app/services/store';
import { setupApplicationTest } from 'test-app/tests/helpers';
import {
  HttpResponse,
  buildPost,
  delay,
  http,
  worker,
} from 'test-app/tests/helpers/msw';

import { module, test } from 'qunit';

function peekCachedRecord<T>(store: Store, type: string, id: string): T | null {
  const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({
    type,
    id,
  });

  return store.cache.peek(identifier) as T | null;
}

module('Application | index', function (hooks) {
  setupApplicationTest(hooks);

  test('it shows the loading state before rendering posts', async function (assert) {
    worker.use(
      http.get('/posts', async function () {
        await delay(150);
        return HttpResponse.json([buildPost()]);
      }),
    );

    const visitPromise = visit('/');

    await waitFor('[data-test-posts-loading]');
    assert.dom('[data-test-posts-loading]').exists();

    await visitPromise;

    assert.dom('[data-test-post-row]').exists({ count: 1 });
  });

  test('it boots the Ember app and renders schema-backed posts', async function (assert) {
    await visit('/');

    assert.dom('[data-test-nav-home]').hasText('Posts');
    assert.dom('[data-test-nav-new-post]').hasText('New Post');
    assert.dom('[data-test-post-row]').exists({ count: 1 });
    assert.dom('[data-test-post-title]').hasText('Hello from Polaris');
    assert.dom('[data-test-post-created-at]').hasText('2026-04-15T12:00:00Z');
    assert.strictEqual(currentURL(), '/');
  });

  test('it materializes included relationship records in the store', async function (assert) {
    await visit('/');

    const store = this.owner.lookup('service:store') as Store;
    const author = peekCachedRecord<unknown>(store, 'user', '7');
    const comment = peekCachedRecord<unknown>(store, 'comment', '10');

    assert.notStrictEqual(
      author,
      null,
      'the included author record is present in cache',
    );
    assert.notStrictEqual(
      comment,
      null,
      'the included comment record is present in cache',
    );
  });
});
