import Route from '@ember/routing/route';

export default class PostsPostRoute extends Route {
  model(params: { post_id: string }): string {
    return params.post_id;
  }
}
