import { setBuildURLConfig } from '@warp-drive/utilities';

import {
  createRecord,
  deleteRecord,
  findRecord,
  query,
  updateRecord,
} from '../src/builders';

const mockRecordIdentifierFor = vi.hoisted(() => vi.fn());

vi.mock('@warp-drive/core', () => ({
  recordIdentifierFor: mockRecordIdentifierFor,
}));

describe('global URL configuration', () => {
  beforeEach(() => {
    setBuildURLConfig({
      host: 'https://example.supabase.co',
      namespace: 'rest/v1',
    });

    mockRecordIdentifierFor.mockReturnValue({
      id: '42',
      lid: 'post-42',
      type: 'post',
    } as never);
  });

  afterEach(() => {
    setBuildURLConfig({ host: null, namespace: null });
    mockRecordIdentifierFor.mockReset();
  });

  it('applies the configured host and namespace to queries', () => {
    expect(query('post').url).toBe(
      'https://example.supabase.co/rest/v1/posts?select=*',
    );
  });

  it('keeps findRecord IDs in PostgREST filters', () => {
    const request = findRecord('post', '42');

    expect(request.url).toBe(
      'https://example.supabase.co/rest/v1/posts?id=eq.42&select=*',
    );
    expect(new URL(request.url).pathname).not.toContain('/posts/42');
  });

  it('applies the configured host and namespace to mutations', () => {
    expect(createRecord({}).url).toBe(
      'https://example.supabase.co/rest/v1/posts?select=*',
    );
    expect(updateRecord({}).url).toBe(
      'https://example.supabase.co/rest/v1/posts?id=eq.42&select=*',
    );
    expect(deleteRecord({}).url).toBe(
      'https://example.supabase.co/rest/v1/posts?id=eq.42',
    );
  });

  it('lets every builder override global URL configuration per request', () => {
    const overrides = {
      host: 'https://override.example.com',
      namespace: 'api/v2',
      resourcePath: 'articles',
    };

    expect(query('post', undefined, overrides).url).toBe(
      'https://override.example.com/api/v2/articles?select=*',
    );
    expect(findRecord('post', '42', undefined, overrides).url).toBe(
      'https://override.example.com/api/v2/articles?id=eq.42&select=*',
    );
    expect(createRecord({}, overrides).url).toBe(
      'https://override.example.com/api/v2/articles?select=*',
    );
    expect(updateRecord({}, overrides).url).toBe(
      'https://override.example.com/api/v2/articles?id=eq.42&select=*',
    );
    expect(deleteRecord({}, overrides).url).toBe(
      'https://override.example.com/api/v2/articles?id=eq.42',
    );
  });
});
