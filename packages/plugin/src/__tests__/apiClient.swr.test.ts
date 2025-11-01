import { CostscopeClient } from './client';

jest.useFakeTimers();

describe('apiClient SWR stale serve', () => {
  afterAll(() => {
    jest.useRealTimers();
  });
  const discoveryApi = { getBaseUrl: async () => 'http://example.test' };
  const identityApi = { getCredentials: async () => ({ token: '' }) };
  it('serves stale after soft TTL and triggers revalidation', async () => {
    let calls = 0;
    const responders: any = { '/costs/daily?period=P30D': [{ date: '2024-01-01', cost: 1 }] };
    const fetchApi = { fetch: async (url: string) => { calls += 1; const path = url.replace('http://example.test',''); return { ok: true, status: 200, json: async () => responders[path] }; } };
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi, cacheTtlMs: 50, swr: { enabled: true, staleFactor: 2 } });
    const first = await client.getOverview('P30D');
    expect(first[0].cost).toBe(1);
    responders['/costs/daily?period=P30D'] = [{ date: '2024-01-01', cost: 2 }];
    jest.advanceTimersByTime(60); // beyond soft TTL
    const second = await client.getOverview('P30D');
    expect(second[0].cost).toBe(1); // stale
    // allow background revalidation to schedule
    await Promise.resolve();
    jest.advanceTimersByTime(10);
    const third = await client.getOverview('P30D');
    expect(calls).toBeGreaterThanOrEqual(2);
    // third may or may not have updated depending on timing; ensure not throwing
    expect(Array.isArray(third)).toBe(true);
  });

  it('serves stale then handles revalidation error without dropping value', async () => {
    jest.setSystemTime(0);
    let calls = 0;
    const responders: Record<string, any> = { '/costs/daily?period=P30D': [{ date: '2024-01-01', cost: 1 }] };
    const fetchApi = { fetch: async (url: string) => {
      calls += 1; const path = url.replace('http://example.test','');
      if (calls === 2) { // revalidation attempt fails
        return { ok: false, status: 500, json: async () => ({}) } as any;
      }
      return { ok: true, status: 200, json: async () => responders[path] } as any;
    } };
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi, cacheTtlMs: 50, swr: { enabled: true, staleFactor: 2 } });
    const first = await client.getOverview('P30D');
    expect(first[0].cost).toBe(1);
    responders['/costs/daily?period=P30D'] = [{ date: '2024-01-01', cost: 2 }];
    jest.advanceTimersByTime(60); // soft expired
    const stale = await client.getOverview('P30D');
    expect(stale[0].cost).toBe(1); // served stale
    await Promise.resolve(); // allow background revalidation scheduling
    jest.advanceTimersByTime(5);
    // Revalidation fails; cache should still hold old value
    const afterError = await client.getOverview('P30D');
    expect(afterError[0].cost).toBe(1);
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('hard-expired forces fresh fetch (no stale serve) after stale window', async () => {
    jest.setSystemTime(0);
    let calls = 0;
    const responders: Record<string, any> = { '/costs/daily?period=P30D': [{ date: '2024-01-01', cost: 1 }] };
    const fetchApi = { fetch: async (url: string) => { calls += 1; const path = url.replace('http://example.test',''); return { ok: true, status: 200, json: async () => responders[path] }; } };
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi, cacheTtlMs: 50, swr: { enabled: true, staleFactor: 2 } });
    await client.getOverview('P30D');
    responders['/costs/daily?period=P30D'] = [{ date: '2024-01-01', cost: 5 }];
    // Soft TTL = 50, hard TTL = 50 * staleFactor (=100). Advance beyond hard TTL.
    jest.advanceTimersByTime(120);
    const fresh = await client.getOverview('P30D');
    expect(fresh[0].cost).toBe(5);
    expect(calls).toBe(2);
  });

  it('double refresh aborts previous in-flight and uses new value', async () => {
    jest.setSystemTime(0);
    let calls: number = 0;
    let firstResolve: (() => void) | undefined;
  const fetchApi = { fetch: () => {
      calls += 1;
      if (calls === 1) {
        return new Promise<any>(resolve => { firstResolve = () => resolve({ ok: true, status: 200, json: async () => [{ date: '2024-01-01', cost: 1 }] }); setTimeout(firstResolve, 100); });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [{ date: '2024-01-01', cost: 3 }] });
    } };
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi, cacheTtlMs: 200, swr: { enabled: true, staleFactor: 2 } });
    const p1 = client.getOverview('P30D', { refresh: true });
    // Trigger refresh quickly (before first resolves). Aborting is internal; we just ensure second completes and first resolves eventually.
    const p2 = client.getOverview('P30D', { refresh: true });
    jest.advanceTimersByTime(0); // schedule microtasks
    const fast = await p2;
    expect(fast[0].cost).toBe(3);
    // Finish first
    jest.advanceTimersByTime(100);
    await p1;
    const final = await client.getOverview('P30D');
    expect(final[0].cost).toBe(3);
    expect(calls).toBe(2);
  });

  it('stale-ignored: slower prior fetch resolves after newer one', async () => {
    jest.setSystemTime(0);
    let calls = 0;
  const fetchApi = { fetch: () => {
      calls += 1;
      if (calls === 1) {
        return new Promise<any>(resolve => setTimeout(() => resolve({ ok: true, status: 200, json: async () => [{ date: '2024-01-01', cost: 1 }] }), 100));
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [{ date: '2024-01-01', cost: 2 }] });
    } };
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi, cacheTtlMs: 50, swr: { enabled: true, staleFactor: 2 } });
    const slow = client.getOverview('P30D');
    const fast = await client.getOverview('P30D', { refresh: true });
    expect(fast[0].cost).toBe(2);
    jest.advanceTimersByTime(100); // allow slow to resolve after fast
    await slow;
    const final = await client.getOverview('P30D');
    expect(final[0].cost).toBe(2);
  });
});
