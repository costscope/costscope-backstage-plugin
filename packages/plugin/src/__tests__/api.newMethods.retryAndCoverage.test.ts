import { CostscopeClient } from './client';

/**
 * Tests focused on the "new" client methods (providers / datasets / search / summary / health)
 * to (a) exercise retry-on-503 behavior and (b) cover branches in the generic get() helper:
 *  - signal provided (bypasses internal cache)
 *  - validate override provided (bypasses internal cache)
 *  - prefetchAll inclusion of summary/providers
 */
describe('CostscopeClient new methods retry & coverage', () => {
  const discoveryApi = { getBaseUrl: async () => 'http://example.test' };
  const identityApi = { getCredentials: async () => ({ token: '' }) };

  it('retries 503 for getDatasets then succeeds (HTTP retry path)', async () => {
    let calls = 0;
    const fetchApi = {
      fetch: async (url: string) => {
        if (url.includes('/datasets?project=foo')) {
          calls += 1;
          if (calls === 1) return { ok: false, status: 503 } as any; // trigger retry
          return { ok: true, status: 200, json: async () => [ { id: 'd1', provider: 'aws', periodStart: '2025-01-01', periodEnd: '2025-01-31', records: 10, status: 'ready' } ] } as any;
        }
        return { ok: true, status: 200, json: async () => [] } as any;
      },
    };
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi, retry: { maxAttempts: 3, backoffBaseMs: 1 } });
    const data = await client.getDatasets({ project: 'foo' });
    expect(data).toHaveLength(1);
    expect(calls).toBe(2); // one retry
  });

  it('bypasses internal cache when validate override specified', async () => {
    let calls = 0;
    const fetchApi = {
      fetch: async (url: string) => {
        if (url.endsWith('/providers')) {
          calls += 1;
          return { ok: true, status: 200, json: async () => [ { id: 'aws', name: 'AWS' } ] } as any;
        }
        return { ok: true, status: 200, json: async () => [] } as any;
      },
    };
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi, cacheTtlMs: 60_000 });
    await client.getProviders({ validate: true });
    await client.getProviders({ validate: true });
    expect(calls).toBe(2); // no cache hits because validate override bypassed cache each time
  });


  it('prefetchAll includes summary and providers when available', async () => {
    const requested: string[] = [];
    const fetchApi = {
      fetch: async (url: string) => {
        requested.push(url.replace('http://example.test', ''));
        if (url.includes('/costs/daily')) return { ok: true, json: async () => [ { date: '2025-01-01', cost: 1 } ] } as any;
        if (url.includes('/breakdown')) return { ok: true, json: async () => [ { dim: 'Compute', cost: 2, deltaPct: 0 } ] } as any;
        if (url.includes('/alerts')) return { ok: true, json: async () => [ { id: 'a', severity: 'info', message: 'm' } ] } as any;
        if (url.includes('/costs/summary')) return { ok: true, json: async () => ({ period: 'P5D', totalCost: 10 }) } as any;
        if (url.endsWith('/providers')) return { ok: true, json: async () => [ { id: 'aws', name: 'AWS' } ] } as any;
        return { ok: true, json: async () => [] } as any;
      },
    };
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi });
    const res = await client.prefetchAll({ period: 'P5D', project: 'p1' });
    expect(res.summary?.totalCost).toBe(10);
    expect(res.providers?.[0].id).toBe('aws');
    expect(requested.some(p => p.startsWith('/costs/summary'))).toBe(true);
    expect(requested.some(p => p === '/providers')).toBe(true);
  });
});
