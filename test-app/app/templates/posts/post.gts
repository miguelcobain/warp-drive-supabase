import { on } from '@ember/modifier';
import { LinkTo } from '@ember/routing';
import { service } from '@ember/service';

import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';

import { Request } from '@warp-drive/ember';

import type { Post } from 'test-app/schemas';
import type Store from 'test-app/services/store';

import { findRecord } from 'warp-drive-supabase';

interface Signature {
  Args: {
    model: string;
  };
}

export default class PostsPostTemplate extends Component<Signature> {
  @service declare store: Store;

  @cached
  get postRequest() {
    return this.store.request(
      findRecord<Post>('post', this.args.model, (q) => {
        q.selectAll().embedAll(['authors', 'comments.authors']);
      }),
    );
  }

  <template>
    <section data-test-post-detail-route>
      <Request @request={{this.postRequest}}>
        <:loading>
          <p data-test-post-detail-loading>Loading post…</p>
        </:loading>

        <:error as |error features|>
          <div class="card" data-test-post-detail-error>
            <h2>Unable to load post</h2>
            <p>{{error.response.status}} {{error.response.statusText}}</p>
            <button
              data-test-post-detail-retry
              type="button"
              {{on "click" features.retry}}
            >
              Retry
            </button>
          </div>
        </:error>

        <:content as |document|>
          {{#let document.data as |post|}}
            <article class="card">
              <div class="detail-actions">
                <LinkTo @route="index" data-test-post-detail-back>
                  Back to posts
                </LinkTo>
                <LinkTo
                  @route="posts.edit"
                  @model={{post.id}}
                  data-test-post-detail-edit
                >
                  Edit post
                </LinkTo>
              </div>

              <h2 data-test-post-detail-title>{{post.title}}</h2>
              <p data-test-post-detail-body>{{post.body}}</p>
              <p data-test-post-detail-created-at>{{post.createdAt}}</p>
            </article>
          {{/let}}
        </:content>
      </Request>
    </section>
  </template>
}
