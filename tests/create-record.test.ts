import { createRecord } from '../src/builders/create-record';

const mockRecordIdentifierFor = vi.hoisted(() => vi.fn());

vi.mock('@warp-drive/core', () => ({
  default: {
    recordIdentifierFor: mockRecordIdentifierFor,
  },
}));

describe('createRecord builder', () => {
  it('builds a post request for new records', () => {
    mockRecordIdentifierFor.mockReturnValue({
      id: null,
      lid: 'post-new',
      type: 'post',
    } as never);

    const request = createRecord(
      { title: 'Draft' },
      {
        host: 'https://example.test',
        namespace: 'rest/v1',
      }
    );
    const url = new URL(request.url);

    expect(request.method).toBe('POST');
    expect(request.op).toBe('createRecord');
    expect(url.pathname).toBe('/rest/v1/posts');
    expect(url.searchParams.get('select')).toBe('*');
    expect(request.headers.get('Accept')).toBe('application/vnd.pgrst.object+json');
    expect(request.headers.get('Prefer')).toBe('missing=default, return=representation');
    expect(request.records).toEqual([
      {
        id: null,
        lid: 'post-new',
        type: 'post',
      },
    ]);
  });
});
