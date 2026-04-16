import EmberRouter from '@embroider/router';

import config from 'test-app/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('posts', function () {
    this.route('new');
    this.route('post', { path: '/:post_id' });
    this.route('edit', { path: '/:post_id/edit' });
  });
  this.route('failure');
});
