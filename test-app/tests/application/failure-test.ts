import { visit } from '@ember/test-helpers';

import { setupApplicationTest } from 'test-app/tests/helpers';

import { module, test } from 'qunit';

module('Application | failure', function (hooks) {
  setupApplicationTest(hooks);

  test('it renders a read failure state', async function (assert) {
    await visit('/failure');

    assert.dom('[data-test-failure-heading]').hasText('Failure');
    assert
      .dom('[data-test-failure-message]')
      .hasTextContaining('500 Internal Server Error');
    assert.dom('[data-test-failure-unexpected]').doesNotExist();
  });
});
