import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { action } from '@ember/object';
import type RouterService from '@ember/routing/router-service';
import { service } from '@ember/service';

import Component from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';

import { checkout } from '@warp-drive/core/reactive';
import { Request } from '@warp-drive/ember';

import PostForm, { type PostFormValues } from 'test-app/components/post-form';
import type { EditablePost, Post } from 'test-app/schemas';
import type Store from 'test-app/services/store';
import { normalizeRequestError } from 'test-app/utils/request-errors';

import { deleteRecord, findRecord, updateRecord } from 'warp-drive-supabase';

interface Signature {
  Args: {
    model: string;
  };
}

export default class PostsEditTemplate extends Component<Signature> {
  @service declare router: RouterService;
  @service declare store: Store;

  @tracked errorMessage: string | null = null;

  @cached
  get postRequest() {
    return this.store.request(
      findRecord<Post>('post', this.args.model, (q) => {
        q.selectAll().embedAll(['authors', 'comments.authors']);
      }),
    );
  }

  @action
  async updatePost(values: PostFormValues, post?: Post | null): Promise<void> {
    if (!post) {
      return;
    }

    this.errorMessage = null;

    try {
      const editable = await checkout<EditablePost>(post);

      editable.title = values.title;
      editable.body = values.body;
      editable.createdAt = values.createdAt;

      const result = await this.store.request(
        updateRecord<EditablePost>(editable),
      );
      const savedPost = result.content.data;

      if (savedPost.id) {
        this.router.transitionTo('posts.post', savedPost.id);
      }
    } catch (error) {
      this.errorMessage = await normalizeRequestError(
        error,
        'Failed to update post',
      );
    }
  }

  @action
  async removePost(post?: Post | null): Promise<void> {
    if (!post) {
      return;
    }

    this.errorMessage = null;

    try {
      await this.store.request(deleteRecord(post));
      this.router.transitionTo('index');
    } catch (error) {
      this.errorMessage = await normalizeRequestError(
        error,
        'Failed to delete post',
      );
    }
  }

  <template>
    <section data-test-edit-post-route>
      <Request @request={{this.postRequest}}>
        <:loading>
          <p data-test-edit-post-loading>Loading editable post…</p>
        </:loading>

        <:error as |error features|>
          <div class="card" data-test-edit-post-error>
            <h2>Unable to load editable post</h2>
            <p>{{error.response.status}} {{error.response.statusText}}</p>
            <button
              data-test-edit-post-retry
              type="button"
              {{on "click" features.retry}}
            >
              Retry
            </button>
          </div>
        </:error>

        <:content as |document|>
          <div class="edit-post-actions">
            <PostForm
              @errorMessage={{this.errorMessage}}
              @heading="Edit Post"
              @onSubmit={{this.updatePost}}
              @post={{document.data}}
              @submitLabel="Save Post"
            />

            <button
              class="post-form-delete"
              data-test-post-delete
              type="button"
              {{on "click" (fn this.removePost document.data)}}
            >
              Delete Post
            </button>
          </div>
        </:content>
      </Request>
    </section>
  </template>
}
