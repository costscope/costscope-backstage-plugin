import { CostscopeClient } from '../index';

function makeClientWithResponse(jsonObj: any) {
  const baseUrl = 'http://example.local';
  const discoveryApi = {
    async getBaseUrl() {
      return baseUrl;
    },
  } as any;
  const identityApi = {
    async getCredentials() {
      return { token: '' };
    },
  } as any;
  const fetchApi = {
    async fetch(url: string) {
      // emulate Response subset used by transport
      return {
        ok: true,
        status: 200,
        async json() {
          return jsonObj;
        },
      } as any;
    },
  } as any;
  return new CostscopeClient({ discoveryApi, fetchApi, identityApi, enableInternalCache: false });
}

describe('getProviders envelope tolerance', () => {
  it('returns array as-is when backend returns a raw array', async () => {
    const client = makeClientWithResponse([{ id: 'aws' }, { id: 'gcp' }]);
    const res = await client.getProviders();
    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(2);
    expect(res[0]).toEqual({ id: 'aws' });
  });

  it('unwraps { providers: [...] } envelope', async () => {
    const client = makeClientWithResponse({ providers: [{ id: 'azure' }], total: 1 });
    const res = await client.getProviders();
    expect(Array.isArray(res)).toBe(true);
    expect(res).toEqual([{ id: 'azure' }]);
  });

  it('unwraps { data: { providers: [...] } } envelope', async () => {
    const client = makeClientWithResponse({ data: { providers: [{ id: 'aws' }] } });
    const res = await client.getProviders();
    expect(res).toEqual([{ id: 'aws' }]);
  });
});
