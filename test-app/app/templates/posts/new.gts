import { action } from '@ember/object';
import type RouterService from '@ember/routing/router-service';
import { service } from '@ember/service';

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import PostForm, { type PostFormValues } from 'test-app/components/post-form';
import type Store from 'test-app/services/store';
import { normalizeRequestError } from 'test-app/utils/request-errors';
import type {
  EditablePostResource,
  PostResource,
} from 'test-app/utils/resource-schemas';

import { createRecord } from 'warp-drive-supabase';

export default class PostsNewTemplate extends Component {
  @service declare router: RouterService;
  @service declare store: Store;

  @tracked errorMessage: string | null = null;

  @action
  async createPost(values: PostFormValues): Promise<void> {
    this.errorMessage = null;

    try {
      const draft = this.store.createRecord<EditablePostResource>('post', {
        body: values.body,
        createdAt: values.createdAt,
        title: values.title,
      });

      const result = await this.store.request(
        createRecord<PostResource>(draft),
      );
      const post = result.content.data;

      if (post.id) {
        this.router.transitionTo('posts.post', post.id);
      }
    } catch (error) {
      this.errorMessage = await normalizeRequestError(
        error,
        'Failed to create post',
      );
    }
  }

  <template>
    <section data-test-new-post-route>
      <PostForm
        @errorMessage={{this.errorMessage}}
        @heading="New Post"
        @onSubmit={{this.createPost}}
        @submitLabel="Create Post"
      />
    </section>
  </template>
}
