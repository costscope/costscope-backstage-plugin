import { CostscopeClient } from './client';

describe('CostscopeClient telemetry option', () => {
  it('emits retry success and cache miss/hit through telemetry callback', async () => {
    const events: any[] = [];
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: jest.fn(async (_url: string) => {
          // Return different payloads per invocation so we can see cache behavior
          const count = (mock.fetchApi.fetch as jest.Mock).mock.calls.length;
          return { ok: true, json: async () => [{ date: '2025-01-01', cost: count }] } as any;
        }),
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, cacheTtlMs: 60_000, retry: { maxAttempts: 1 }, telemetry: (e) => events.push(e) });

    // First call -> miss
    const a = await client.getOverview('P1D');
    expect(a[0].cost).toBe(1);
    // Second call -> hit
    const b = await client.getOverview('P1D');
    expect(b[0].cost).toBe(1);
    // Refresh -> bypass
    const c = await client.getOverview('P1D', { refresh: true });
    expect(c[0].cost).toBe(2);

    const cacheEvents = events.filter(e => e.type === 'cache' && e.path?.startsWith('/costs/daily'));
    expect(cacheEvents.map((e: any) => e.kind)).toEqual(['miss', 'hit', 'refresh-bypass']);
    // Also expect that retry success was recorded once per request series
    const retrySuccess = events.filter(e => e.type === 'retry' && e.success === true);
    expect(retrySuccess.length).toBeGreaterThanOrEqual(2); // at least two successful HTTPs (first + refresh)
  });

  it('emits retry failure (HTTP_ERROR) through telemetry callback', async () => {
    const events: any[] = [];
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: { fetch: async () => ({ ok: false, status: 503 }) },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, retry: { maxAttempts: 2, backoffBaseMs: 1 }, telemetry: (e) => events.push(e) });
    await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: 'HTTP_ERROR' });
    const retryFailure = events.find(e => e.type === 'retry' && e.success === false);
    expect(retryFailure).toBeTruthy();
    expect(typeof retryFailure.attempts).toBe('number');
  });

  it('emits validation events when runtime validation enabled', async () => {
    const events: any[] = [];
    (process as any).env.COSTSCOPE_RUNTIME_VALIDATE = 'true';
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: { fetch: async () => ({ ok: true, json: async () => [] }) },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, telemetry: (e) => events.push(e) });
    await client.getOverview('P1D');
    // Should have a validation success event
    const v = events.find(e => e.type === 'validation' && e.success === true);
    expect(v).toBeTruthy();
    delete (process as any).env.COSTSCOPE_RUNTIME_VALIDATE;
  });
});
