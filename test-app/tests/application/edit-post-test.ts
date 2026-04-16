import { click, currentURL, fillIn, visit } from '@ember/test-helpers';

import { setupApplicationTest } from 'test-app/tests/helpers';

import { module, test } from 'qunit';

module('Application | edit post', function (hooks) {
  setupApplicationTest(hooks);

  test('it updates a post through checkout plus updateRecord', async function (assert) {
    await visit('/posts/1/edit');

    await fillIn('[data-test-post-title-input]', 'Updated from route form');
    await click('[data-test-post-submit]');

    assert.strictEqual(currentURL(), '/posts/1');
    assert
      .dom('[data-test-post-detail-title]')
      .hasText('Updated from route form');
  });
});
