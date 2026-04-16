import { setApplication } from '@ember/test-helpers';

import '@warp-drive/ember/install';

import { start as qunitStart, setupEmberOnerrorValidation } from 'ember-qunit';

import Application from 'test-app/app';
import config from 'test-app/config/environment';
import { startMocking } from 'test-app/tests/helpers/msw';

import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';

export async function start() {
  await startMocking();

  setApplication(Application.create(config.APP));

  setup(QUnit.assert);
  setupEmberOnerrorValidation();

  qunitStart();
}
