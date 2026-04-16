import { click, currentURL, fillIn, visit } from '@ember/test-helpers';

import { setupApplicationTest } from 'test-app/tests/helpers';

import { module, test } from 'qunit';

module('Application | new post', function (hooks) {
  setupApplicationTest(hooks);

  test('it creates a post through the real createRecord builder', async function (assert) {
    await visit('/posts/new');

    await fillIn('[data-test-post-title-input]', 'Created from route form');
    await fillIn(
      '[data-test-post-body-input]',
      'Created in a conventional Ember route',
    );
    await fillIn('[data-test-post-created-at-input]', '2026-04-15T15:00:00Z');
    await click('[data-test-post-submit]');

    assert.strictEqual(currentURL(), '/posts/2');
    assert
      .dom('[data-test-post-detail-title]')
      .hasText('Created from route form');
    assert
      .dom('[data-test-post-detail-body]')
      .hasText('Created in a conventional Ember route');
  });

  test('it surfaces write failures without a harness service', async function (assert) {
    await visit('/posts/new');

    await fillIn('[data-test-post-title-input]', 'Fail write request');
    await fillIn('[data-test-post-body-input]', 'This request should fail');
    await fillIn('[data-test-post-created-at-input]', '2026-04-15T15:00:00Z');
    await click('[data-test-post-submit]');

    assert.strictEqual(currentURL(), '/posts/new');
    assert
      .dom('[data-test-post-form-error]')
      .hasText('Simulated write failure');
  });
});
