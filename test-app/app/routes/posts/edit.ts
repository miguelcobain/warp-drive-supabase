import Route from '@ember/routing/route';

export default class PostsEditRoute extends Route {
  model(params: { post_id: string }): string {
    return params.post_id;
  }
}
