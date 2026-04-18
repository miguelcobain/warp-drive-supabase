import { deleteRecord } from '../src/builders/delete-record';

const mockRecordIdentifierFor = vi.hoisted(() => vi.fn());

vi.mock('@warp-drive/core', () => ({
  recordIdentifierFor: mockRecordIdentifierFor,
}));

describe('deleteRecord builder', () => {
  it('builds a delete request for persisted records', () => {
    mockRecordIdentifierFor.mockReturnValue({
      id: '1',
      lid: 'post-1',
      type: 'post',
    } as never);

    const request = deleteRecord(
      { id: '1' },
      {
        host: 'https://example.test',
        namespace: 'rest/v1',
      }
    );
    const url = new URL(request.url);

    expect(request.method).toBe('DELETE');
    expect(request.op).toBe('deleteRecord');
    expect(url.pathname).toBe('/rest/v1/posts');
    expect(url.searchParams.get('id')).toBe('eq.1');
    expect(url.searchParams.has('select')).toBe(false);
    expect(request.headers.get('Accept')).toBeNull();
    expect(request.headers.get('Prefer')).toBeNull();
    expect(request.records).toEqual([
      {
        id: '1',
        lid: 'post-1',
        type: 'post',
      },
    ]);
  });
});
