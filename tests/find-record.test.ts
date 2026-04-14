import { findRecord } from '../src/builders/find-record';

describe('findRecord builder', () => {
  it('builds a singular PostgREST request', () => {
    const request = findRecord('user', '1', {
      include: ['organization.properties', 'role'],
    });
    const url = new URL(request.url, 'https://example.test');

    expect(request.method).toBe('GET');
    expect(request.op).toBe('findRecord');
    expect(url.pathname).toBe('/users');
    expect(url.searchParams.get('id')).toBe('eq.1');
    expect(url.searchParams.get('select')).toBe('*,organizations(*,properties(*)),roles(*)');
    expect(request.headers.get('Accept')).toBe('application/vnd.pgrst.object+json');
  });
});
