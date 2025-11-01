import { CostscopeClient } from './client';

describe('apiClient (modular) basic behavior', () => {
  const discoveryApi = { getBaseUrl: async () => 'http://example.test' };
  const identityApi = { getCredentials: async () => ({ token: '' }) };
  function makeFetch(responders: Record<string, any>) {
    return {
      fetch: async (url: string) => {
        const path = url.replace('http://example.test', '');
        const value = responders[path];
        if (!value) return { ok: false, status: 404, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => value };
      },
    };
  }

  it('fetches overview and caches result', async () => {
    const responders: any = { '/costs/daily?period=P30D': [{ date: '2024-01-01', cost: 1 }] };
    const fetchApi = makeFetch(responders);
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi });
    const first = await client.getOverview('P30D');
    responders['/costs/daily?period=P30D'] = [{ date: '2024-01-01', cost: 999 }];
    const second = await client.getOverview('P30D');
    expect(first[0].cost).toBe(1);
    expect(second[0].cost).toBe(1); // cached value
  });

  it('refresh bypasses cache', async () => {
    const responders: any = { '/alerts': [{ id: 'a', severity: 'info', message: 'hi' }] };
    const fetchApi = makeFetch(responders);
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi });
    const first = await client.getActionItems();
    responders['/alerts'] = [{ id: 'a', severity: 'info', message: 'updated' }];
    const refreshed = await client.getActionItems({ refresh: true });
    expect(first[0].message).toBe('hi');
    expect(refreshed[0].message).toBe('updated');
  });

  it('prefetchAll returns correlationId and arrays (datasets omitted when no project)', async () => {
    const responders: any = {
      '/costs/daily?period=P30D': [{ date: '2024-01-01', cost: 1 }],
      '/breakdown?by=ServiceCategory&period=P30D': [{ dim: 'X', cost: 2, deltaPct: 0 }],
      '/alerts': [],
    '/costs/summary?period=P30D': { period: 'P30D', totalCost: 3 },
    '/providers': [{ id: 'aws', name: 'AWS' }],
    };
    const fetchApi = makeFetch(responders);
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi });
    const res = await client.prefetchAll({ period: 'P30D' });
  expect((res.overview as any[]).length).toBe(1);
  expect((res.breakdown as any[]).length).toBe(1);
  expect((res.alerts as any[]).length).toBe(0);
  expect(res.summary?.totalCost).toBe(3);
  expect(res.providers?.[0].id).toBe('aws');
  expect(res.datasets).toBeUndefined();
  // with project -> datasets included
  responders['/datasets?project=p1'] = [{ id: 'd', provider: 'aws', periodStart: '2025-01-01', periodEnd: '2025-01-31', records: 10, status: 'ready' }];
  responders['/costs/daily?period=P30D&project=p1'] = responders['/costs/daily?period=P30D'];
  responders['/breakdown?by=ServiceCategory&period=P30D&project=p1'] = responders['/breakdown?by=ServiceCategory&period=P30D'];
  responders['/alerts?project=p1'] = responders['/alerts'];
  responders['/costs/summary?period=P30D&project=p1'] = responders['/costs/summary?period=P30D'];
  const res2 = await client.prefetchAll({ period: 'P30D', project: 'p1' });
  expect(res2.datasets?.[0].id).toBe('d');
    expect(res.correlationId).toBeTruthy();
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });
});
