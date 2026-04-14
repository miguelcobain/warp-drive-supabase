import { updateRecord } from '../src/builders/update-record';

const mockRecordIdentifierFor = vi.hoisted(() => vi.fn());

vi.mock('@warp-drive/core', () => ({
  default: {
    recordIdentifierFor: mockRecordIdentifierFor,
  },
}));

describe('updateRecord builder', () => {
  it('builds a patch request for persisted records', () => {
    mockRecordIdentifierFor.mockReturnValue({
      id: '1',
      lid: 'post-1',
      type: 'post',
    } as never);

    const request = updateRecord(
      { id: '1' },
      {
        host: 'https://example.test',
        namespace: 'rest/v1',
      }
    );
    const url = new URL(request.url);

    expect(request.method).toBe('PATCH');
    expect(request.op).toBe('updateRecord');
    expect(url.pathname).toBe('/rest/v1/posts');
    expect(url.searchParams.get('id')).toBe('eq.1');
    expect(url.searchParams.get('select')).toBe('*');
    expect(request.headers.get('Prefer')).toBe('missing=default, return=representation');
  });
});
