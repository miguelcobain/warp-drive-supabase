import ENV from 'test-app/config/environment';

import { HttpResponse, delay, http } from 'msw';
import { setupWorker } from 'msw/browser';

const API_KEY = 'anon-test-key';
const AUTHORIZATION = 'Bearer test-access-token';
const COLLECTION_SELECT = '*,authors(*),comments(*,authors(*))';
const SINGLE_SELECT = '*,authors(*),comments(*,authors(*))';
export const POSTS_ENDPOINT = `${ENV.supabase.url.replace(/\/+$/, '')}/rest/v1/posts`;

interface PostPayload {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_id: string | null;
  authors: ReturnType<typeof buildUser> | null;
  comments: Array<{
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    post_id: string;
    authors: ReturnType<typeof buildUser>;
  }>;
}

export function buildUser(id: string, firstName: string, lastName: string) {
  return {
    id,
    first_name: firstName,
    last_name: lastName,
  };
}

export function buildPost(
  title = 'Hello from Polaris',
  overrides: Partial<PostPayload> = {},
): PostPayload {
  return {
    id: overrides.id ?? '1',
    title: overrides.title ?? title,
    body: overrides.body ?? 'Stored in Supabase',
    created_at: overrides.created_at ?? '2026-04-15T12:00:00Z',
    author_id: overrides.author_id ?? '7',
    authors: overrides.authors ?? buildUser('7', 'Ada', 'Lovelace'),
    comments: overrides.comments ?? [
      {
        id: '10',
        body: 'First comment',
        created_at: '2026-04-15T12:30:00Z',
        author_id: '8',
        post_id: overrides.id ?? '1',
        authors: buildUser('8', 'Grace', 'Hopper'),
      },
    ],
  };
}

let posts: PostPayload[] = [];

function resetMockData(): void {
  posts = [buildPost()];
}

function validateAuth(request: Request): Response | null {
  if (request.headers.get('apikey') !== API_KEY) {
    return HttpResponse.json(
      { message: 'Missing or invalid apikey header' },
      { status: 400 },
    );
  }

  if (request.headers.get('Authorization') !== AUTHORIZATION) {
    return HttpResponse.json(
      { message: 'Missing or invalid Authorization header' },
      { status: 400 },
    );
  }

  return null;
}

function sortedKeys(body: Record<string, unknown>): string[] {
  return Object.keys(body).sort((left, right) => left.localeCompare(right));
}

function createHandlers() {
  return [
    http.get(POSTS_ENDPOINT, ({ request }) => {
      const authFailure = validateAuth(request);
      if (authFailure) {
        return authFailure;
      }

      const url = new URL(request.url);

      if (url.searchParams.get('fail') === 'read') {
        return HttpResponse.json(
          { message: 'Simulated read failure' },
          { status: 500 },
        );
      }

      const idFilter = url.searchParams.get('id');

      if (idFilter) {
        if (
          request.headers.get('Accept') !== 'application/vnd.pgrst.object+json'
        ) {
          return HttpResponse.json(
            { message: 'Expected singular Accept header for findRecord' },
            { status: 400 },
          );
        }

        const id = idFilter.slice(3);
        const post = posts.find((entry) => entry.id === id);

        if (!post) {
          return HttpResponse.json(
            { message: 'Record not found' },
            { status: 404 },
          );
        }

        if (url.searchParams.get('select') !== SINGLE_SELECT) {
          return HttpResponse.json(
            { message: 'Unexpected select clause for findRecord' },
            { status: 400 },
          );
        }

        return HttpResponse.json(post);
      }

      if (request.headers.get('Accept') !== 'application/json;charset=utf-8') {
        return HttpResponse.json(
          { message: 'Expected collection Accept header for query' },
          { status: 400 },
        );
      }

      if (url.searchParams.get('order') !== 'created_at.asc') {
        return HttpResponse.json(
          { message: 'Expected PostgREST order clause' },
          { status: 400 },
        );
      }

      if (url.searchParams.get('select') !== COLLECTION_SELECT) {
        return HttpResponse.json(
          { message: 'Unexpected select clause for query' },
          { status: 400 },
        );
      }

      return HttpResponse.json(posts);
    }),

    http.post(POSTS_ENDPOINT, async ({ request }) => {
      const authFailure = validateAuth(request);
      if (authFailure) {
        return authFailure;
      }

      if (
        request.headers.get('Accept') !== 'application/vnd.pgrst.object+json'
      ) {
        return HttpResponse.json(
          { message: 'Expected singular Accept header for createRecord' },
          { status: 400 },
        );
      }

      if (
        request.headers.get('Prefer') !==
        'missing=default, return=representation'
      ) {
        return HttpResponse.json(
          { message: 'Expected Prefer header for createRecord' },
          { status: 400 },
        );
      }

      if (!request.headers.get('Content-Type')?.includes('application/json')) {
        return HttpResponse.json(
          { message: 'Expected JSON body for createRecord' },
          { status: 400 },
        );
      }

      const body = (await request.json()) as Record<string, unknown>;

      if ((body.title as string | undefined) === 'Fail write request') {
        return HttpResponse.json(
          { message: 'Simulated write failure' },
          { status: 422 },
        );
      }

      const keys = sortedKeys(body);
      if (keys.join(',') !== 'body,created_at,title') {
        return HttpResponse.json(
          {
            message: `Expected create payload keys body,created_at,title but received ${keys.join(',')}`,
          },
          { status: 400 },
        );
      }

      if ('createdAt' in body) {
        return HttpResponse.json(
          { message: 'Create payload should use created_at sourceKey' },
          { status: 400 },
        );
      }

      const createdPost = buildPost(String(body.title), {
        author_id: null,
        authors: null,
        body: String(body.body),
        comments: [],
        created_at: String(body.created_at),
        id: String(posts.length + 1),
      });

      posts = [...posts, createdPost];

      return HttpResponse.json(createdPost);
    }),

    http.patch(POSTS_ENDPOINT, async ({ request }) => {
      const authFailure = validateAuth(request);
      if (authFailure) {
        return authFailure;
      }

      const url = new URL(request.url);
      if (url.searchParams.get('id') !== 'eq.1') {
        return HttpResponse.json(
          { message: 'Expected updateRecord to target post 1' },
          { status: 400 },
        );
      }

      if (url.searchParams.get('select') !== '*') {
        return HttpResponse.json(
          { message: 'Expected updateRecord to request select=*' },
          { status: 400 },
        );
      }

      if (
        request.headers.get('Prefer') !==
        'missing=default, return=representation'
      ) {
        return HttpResponse.json(
          { message: 'Expected Prefer header for updateRecord' },
          { status: 400 },
        );
      }

      const body = (await request.json()) as Record<string, unknown>;
      const keys = sortedKeys(body);

      if (keys.join(',') !== 'title') {
        return HttpResponse.json(
          {
            message: `Expected only changed attrs in update payload but received ${keys.join(',')}`,
          },
          { status: 400 },
        );
      }

      const index = posts.findIndex((entry) => entry.id === '1');
      if (index === -1) {
        return HttpResponse.json(
          { message: 'Expected update target to exist' },
          { status: 404 },
        );
      }

      const updatedPost = buildPost(String(body.title), {
        ...posts[index],
        title: String(body.title),
      });

      posts[index] = updatedPost;

      return HttpResponse.json(updatedPost);
    }),

    http.delete(POSTS_ENDPOINT, ({ request }) => {
      const authFailure = validateAuth(request);
      if (authFailure) {
        return authFailure;
      }

      const url = new URL(request.url);

      if (url.searchParams.get('id') !== 'eq.1') {
        return HttpResponse.json(
          { message: 'Expected deleteRecord to target post 1' },
          { status: 400 },
        );
      }

      if (url.searchParams.has('select')) {
        return HttpResponse.json(
          { message: 'deleteRecord should not request select=*' },
          { status: 400 },
        );
      }

      if (request.headers.get('Prefer') === 'return=representation') {
        return HttpResponse.json(
          { message: 'deleteRecord should not request return=representation' },
          { status: 400 },
        );
      }

      if (
        request.headers.get('Accept') === 'application/vnd.pgrst.object+json'
      ) {
        return HttpResponse.json(
          { message: 'deleteRecord should not request singular object Accept' },
          { status: 400 },
        );
      }

      posts = posts.filter((entry) => entry.id !== '1');

      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

resetMockData();

export const worker = setupWorker(...createHandlers());
export { delay, http, HttpResponse };

let hasStarted = false;

export async function startMocking(): Promise<void> {
  if (hasStarted) {
    return;
  }

  await worker.start({
    onUnhandledRequest: 'error',
    quiet: true,
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });

  hasStarted = true;
}

export function setupMSW(hooks: NestedHooks): void {
  hooks.beforeEach(function () {
    resetMockData();
    worker.resetHandlers(...createHandlers());
  });

  hooks.afterEach(function () {
    resetMockData();
    worker.resetHandlers(...createHandlers());
  });
}
