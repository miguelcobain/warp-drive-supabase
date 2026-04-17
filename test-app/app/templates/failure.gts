import { on } from '@ember/modifier';
import { service } from '@ember/service';

import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';

import { Request } from '@warp-drive/ember';

import type { Post } from 'test-app/schemas';
import type Store from 'test-app/services/store';

import { query } from 'warp-drive-supabase';

export default class FailureTemplate extends Component {
  @service declare store: Store;

  @cached
  get failureRequest() {
    return this.store.request(
      query<Post>('post', {
        filter: { fail: 'read' },
        include: ['author', 'comments.author'],
      }),
    );
  }

  <template>
    <section data-test-failure-route>
      <h2 data-test-failure-heading>Failure</h2>

      <Request @request={{this.failureRequest}}>
        <:loading>
          <p data-test-failure-loading>Loading failure state…</p>
        </:loading>

        <:error as |error features|>
          <div class="card" data-test-failure-card>
            <p data-test-failure-message>
              {{error.response.status}}
              {{error.response.statusText}}
            </p>
            <button
              data-test-failure-retry
              type="button"
              {{on "click" features.retry}}
            >
              Retry
            </button>
          </div>
        </:error>

        <:content>
          <p data-test-failure-unexpected>Expected this request to fail.</p>
        </:content>
      </Request>
    </section>
  </template>
}
