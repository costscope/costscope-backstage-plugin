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
    async fetch() {
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

describe('getDatasets envelope tolerance', () => {
  it('returns array when backend returns raw array', async () => {
    const client = makeClientWithResponse([{ id: 'd1' }]);
    const res = await client.getDatasets();
    expect(res).toEqual([{ id: 'd1' }]);
  });
  it('unwraps { datasets: [...] } envelope', async () => {
    const client = makeClientWithResponse({ datasets: [{ id: 'd2' }], total: 1 });
    const res = await client.getDatasets();
    expect(res).toEqual([{ id: 'd2' }]);
  });
  it('unwraps nested { data: { datasets: [...] } }', async () => {
    const client = makeClientWithResponse({ data: { datasets: [{ id: 'd3' }] } });
    const res = await client.getDatasets();
    expect(res).toEqual([{ id: 'd3' }]);
  });
});
