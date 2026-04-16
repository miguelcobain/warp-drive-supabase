import { on } from '@ember/modifier';
import { LinkTo } from '@ember/routing';
import { service } from '@ember/service';

import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';

import { Request } from '@warp-drive/ember';

import type Store from 'test-app/services/store';
import type { Post } from 'test-app/utils/resource-schemas';

import { query } from 'warp-drive-supabase';

export default class IndexTemplate extends Component {
  @service declare store: Store;

  @cached
  get postsRequest() {
    return this.store.request(
      query<Post>('post', {
        include: ['author', 'comments.author'],
        order: ['created_at.asc'],
      }),
    );
  }

  <template>
    <section data-test-posts-route>
      <h2 data-test-posts-heading>Posts</h2>
      <p class="page-copy">
        The index route fetches through Warp Drive using the real
        `query('post')` builder.
      </p>

      <Request @request={{this.postsRequest}}>
        <:loading>
          <p data-test-posts-loading>Loading posts…</p>
        </:loading>

        <:error as |error features|>
          <div class="card" data-test-posts-error>
            <h3>Unable to load posts</h3>
            <p>{{error.response.status}} {{error.response.statusText}}</p>
            <button
              data-test-posts-retry
              type="button"
              {{on "click" features.retry}}
            >
              Retry
            </button>
          </div>
        </:error>

        <:content as |document|>
          <ul class="posts" data-test-post-list>
            {{#each document.data as |post|}}
              <li class="posts-item" data-test-post-row>
                <h3 data-test-post-title>{{post.title}}</h3>
                <p data-test-post-created-at>{{post.createdAt}}</p>

                <div class="post-actions">
                  <LinkTo
                    @route="posts.post"
                    @model={{post.id}}
                    data-test-post-detail-link
                  >
                    View
                  </LinkTo>
                  <LinkTo
                    @route="posts.edit"
                    @model={{post.id}}
                    data-test-post-edit-link
                  >
                    Edit
                  </LinkTo>
                </div>
              </li>
            {{/each}}
          </ul>
        </:content>
      </Request>
    </section>
  </template>
}
