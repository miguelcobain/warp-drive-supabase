import { currentURL, visit, waitFor } from '@ember/test-helpers';

import type { Post } from 'test-app/schemas';
import type Store from 'test-app/services/store';
import { setupApplicationTest } from 'test-app/tests/helpers';
import {
  HttpResponse,
  POSTS_ENDPOINT,
  buildPost,
  delay,
  http,
  worker,
} from 'test-app/tests/helpers/msw';

import { module, test } from 'qunit';
import { query } from 'warp-drive-supabase';

function peekCachedRecord<T>(store: Store, type: string, id: string): T | null {
  const identifier = store.cacheKeyManager.getOrCreateRecordIdentifier({
    type,
    id,
  });

  return store.cache.peek(identifier) as T | null;
}

module('Application | index', function (hooks) {
  setupApplicationTest(hooks);

  test('it shows the loading state before rendering posts', async function (assert) {
    worker.use(
      http.get(POSTS_ENDPOINT, async function () {
        await delay(150);
        return HttpResponse.json([buildPost()]);
      }),
    );

    const visitPromise = visit('/');

    await waitFor('[data-test-posts-loading]');
    assert.dom('[data-test-posts-loading]').exists();

    await visitPromise;

    assert.dom('[data-test-post-row]').exists({ count: 1 });
  });

  test('it boots the Ember app and renders schema-backed posts', async function (assert) {
    await visit('/');

    assert.dom('[data-test-nav-home]').hasText('Posts');
    assert.dom('[data-test-nav-new-post]').hasText('New Post');
    assert.dom('[data-test-post-row]').exists({ count: 1 });
    assert.dom('[data-test-post-title]').hasText('Hello from Polaris');
    assert.dom('[data-test-post-created-at]').hasText('2026-04-15T12:00:00Z');
    assert.strictEqual(currentURL(), '/');
  });

  test('it materializes included relationship records in the store', async function (assert) {
    await visit('/');

    const store = this.owner.lookup('service:store') as Store;
    const author = peekCachedRecord<unknown>(store, 'user', '7');
    const comment = peekCachedRecord<unknown>(store, 'comment', '10');

    assert.notStrictEqual(
      author,
      null,
      'the included author record is present in cache',
    );
    assert.notStrictEqual(
      comment,
      null,
      'the included comment record is present in cache',
    );
  });

  test('it navigates paginated PostgREST collections through Warp Drive', async function (assert) {
    const paginatedPosts = [
      buildPost('First page', { id: '1' }),
      buildPost('Second page', { id: '2' }),
      buildPost('Third page', { id: '3' }),
    ];
    const observedOffsets: string[] = [];

    worker.use(
      http.get(POSTS_ENDPOINT, ({ request }) => {
        const url = new URL(request.url);
        const limit = Number(url.searchParams.get('limit'));
        const offset = Number(url.searchParams.get('offset'));
        const page = paginatedPosts.slice(offset, offset + limit);
        observedOffsets.push(url.searchParams.get('offset') ?? 'missing');

        assert.strictEqual(
          url.hash,
          '',
          'pagination metadata is not sent to PostgREST',
        );
        assert.strictEqual(request.headers.get('Prefer'), 'count=exact');
        assert.strictEqual(request.headers.get('apikey'), 'anon-test-key');
        assert.strictEqual(
          request.headers.get('Authorization'),
          'Bearer test-access-token',
        );

        return HttpResponse.json(page, {
          status: 206,
          headers: {
            'Content-Range': `${offset}-${offset + page.length - 1}/${paginatedPosts.length}`,
          },
        });
      }),
    );

    const store = this.owner.lookup('service:store') as Store;
    const firstResponse = await store.request(
      query<Post>('post', (q) => {
        q.orderBy('created_at', { direction: 'asc' });
        q.page({ size: 1 });
      }),
    );
    const firstPage = firstResponse.content;
    const secondPage = await firstPage.next();
    const secondPageData = secondPage?.data;

    assert.strictEqual(firstPage.data[0]?.title, 'First page');
    assert.strictEqual(firstPage.meta?.['currentPage'], 1);
    assert.strictEqual(firstPage.meta?.['totalPages'], 3);
    assert.strictEqual(firstPage.meta?.['totalItems'], 3);
    assert.ok(secondPageData, 'the next page is a data document');
    assert.strictEqual(secondPageData?.[0]?.title, 'Second page');
    assert.deepEqual(observedOffsets, ['0', '1']);
  });
});
