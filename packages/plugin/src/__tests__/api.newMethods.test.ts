import { CostscopeClient } from './client';

describe('CostscopeClient new methods', () => {
  const discoveryApi = { getBaseUrl: async () => 'http://example.test' };
  const identityApi = { getCredentials: async () => ({ token: '' }) };

  function makeFetch(map: Record<string, any>) {
    return {
      fetch: async (url: string) => {
        const path = url.replace('http://example.test', '');
        const value = map[path];
        if (value === undefined) return { ok: false, status: 404, json: async () => ({}) } as any;
        if (value && value.__status) return { ok: false, status: value.__status, json: async () => ({}) } as any;
        return { ok: true, status: 200, json: async () => value } as any;
      },
    };
  }

  it('fetches providers/datasets/search/summary/health successfully', async () => {
    const responders: Record<string, any> = {
      '/providers': [{ id: 'aws', name: 'AWS' }],
      '/datasets?project=foo': [{ id: 'd1', provider: 'aws', periodStart: '2025-01-01', periodEnd: '2025-01-31', records: 10, status: 'ready' }],
  '/datasets/search?limit=5&project=foo': [
        { id: 'd1', provider: 'aws', periodStart: '2025-01-01', periodEnd: '2025-01-31', records: 10, status: 'ready' },
      ],
      '/costs/summary?period=P7D': { period: 'P7D', totalCost: 123 },
      '/healthz': { status: 'ok' },
    };
    const fetchApi = makeFetch(responders);
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi });
    expect(await client.getProviders()).toHaveLength(1);
    expect(await client.getDatasets({ project: 'foo' })).toHaveLength(1);
    expect(await client.searchDatasets({ project: 'foo', limit: 5 })).toHaveLength(1);
    const summary = await client.getSummary('P7D');
    expect(summary.totalCost).toBe(123);
    const health = await client.health();
    expect(health.status).toBe('ok');
  });

  it('propagates HTTP error for providers (503)', async () => {
    const responders: Record<string, any> = {
      '/providers': { __status: 503 },
    };
    const fetchApi = makeFetch(responders);
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi, retry: { maxAttempts: 1 } });
    await expect(client.getProviders()).rejects.toMatchObject({ code: 'HTTP_ERROR', status: 503 });
  });
});
