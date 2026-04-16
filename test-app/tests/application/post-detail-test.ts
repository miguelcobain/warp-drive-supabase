import { currentURL, visit } from '@ember/test-helpers';

import type Store from 'test-app/services/store';
import { setupApplicationTest } from 'test-app/tests/helpers';

import { module, test } from 'qunit';

function peekCachedRecord<T>(store: Store, type: string, id: string): T | null {
  const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({
    type,
    id,
  });

  return store.cache.peek(identifier) as T | null;
}

module('Application | post detail', function (hooks) {
  setupApplicationTest(hooks);

  test('it renders a single post through findRecord', async function (assert) {
    await visit('/posts/1');

    assert.strictEqual(currentURL(), '/posts/1');
    assert.dom('[data-test-post-detail-title]').hasText('Hello from Polaris');
    assert.dom('[data-test-post-detail-body]').hasText('Stored in Supabase');
    assert
      .dom('[data-test-post-detail-created-at]')
      .hasText('2026-04-15T12:00:00Z');
  });

  test('it materializes included relationships for the detail request', async function (assert) {
    await visit('/posts/1');

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
