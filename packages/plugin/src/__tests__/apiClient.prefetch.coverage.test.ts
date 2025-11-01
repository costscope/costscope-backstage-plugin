import { CostscopeClient, costscopeApiRef } from './client';

describe('apiClient coverage helpers', () => {
  const discoveryApi = { getBaseUrl: async () => 'http://example.test' };
  const identityApi = { getCredentials: async () => ({ token: '' }) };
  function makeFetch(responders: Record<string, any>) {
    return async (input: any): Promise<any> => {
      const url = new URL(input.toString());
      if (url.pathname.includes('/costs/daily')) return { ok: true, status: 200, json: async () => responders['/costs/daily?period=P30D'] };
      if (url.pathname.includes('/breakdown')) return { ok: true, status: 200, json: async () => responders['/breakdown?by=ServiceCategory&period=P30D'] };
      if (url.pathname.includes('/alerts')) return { ok: true, status: 200, json: async () => responders['/alerts'] };
      if (url.pathname.includes('/costs/summary')) return { ok: true, status: 200, json: async () => responders['/costs/summary?period=P30D'] };
      if (url.pathname.includes('/providers')) return { ok: true, status: 200, json: async () => responders['/providers'] };
      return { ok: false, status: 404, json: async () => ({}) };
    };
  }
  it('prefetchAll executes all endpoints and exposes apiRef id (datasets conditional)', async () => {
    const responders: any = {
      '/costs/daily?period=P30D': [],
      '/breakdown?by=ServiceCategory&period=P30D': [],
      '/alerts': [],
      '/costs/summary?period=P30D': { period: 'P30D', totalCost: 0 },
      '/providers': [],
    };
    const fetchApi = { fetch: makeFetch(responders) } as any;
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi });
    const result = await client.prefetchAll({});
    expect(result).toHaveProperty('overview');
    expect(result).toHaveProperty('summary');
    expect(costscopeApiRef.id).toBe('plugin.costscope.service');
  // second call with explicit period branch
  responders['/costs/daily?period=P7D'] = [];
  responders['/breakdown?by=ServiceCategory&period=P7D'] = [];
  const result2 = await client.prefetchAll({ period: 'P7D' });
  expect(Array.isArray(result2.overview)).toBe(true);
  // add datasets with project to exercise conditional branch
  responders['/datasets?project=foo'] = [];
  const result3 = await client.prefetchAll({ project: 'foo' });
  expect(result3).toHaveProperty('datasets');
  });
});
