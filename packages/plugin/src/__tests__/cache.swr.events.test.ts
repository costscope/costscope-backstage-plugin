import { CostscopeClient } from './client';

type Ev = { type: string; path: string; ts: number; error?: unknown };

describe('InternalCache SWR events', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    // Start at t0 = 0 for deterministic time math
    jest.setSystemTime(0);
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('emits stale-serve -> swr-revalidate-start -> (success|error) and swr-hard-expired', async () => {
    const discoveryApi = { getBaseUrl: async () => 'http://example' };
    const identityApi = { getCredentials: async () => ({ token: '' }) };

    const calls: Record<string, number> = {};
    const ok = (json: any) => ({ ok: true, json: async () => json });

    const fetchApi = {
      fetch: async (fullUrl: string) => {
        const u = new URL(fullUrl);
        const path = `${u.pathname}${u.search}`;
        calls[path] = (calls[path] || 0) + 1;

        if (path.startsWith('/costs/daily?period=P7D')) {
          // P7D: first warm, then revalidate error, then fresh fetch after hard-expired
          const n = calls[path];
          if (n === 1) return ok([{ date: '2025-01-01', cost: 1 }]);
          if (n === 2) return Promise.reject(new Error('revalidate-fail'));
          return ok([{ date: '2025-01-01', cost: 2 }]);
        }
        if (path.startsWith('/costs/daily?period=P14D')) {
          // P14D: first warm, then revalidate success
          const n = calls[path];
          if (n === 1) return ok([{ date: '2025-01-01', cost: 10 }]);
          if (n === 2) return ok([{ date: '2025-01-02', cost: 11 }]);
          return ok([{ date: '2025-01-03', cost: 12 }]);
        }
        return ok({});
      },
    } as any;

    const client = new CostscopeClient({
      discoveryApi,
      fetchApi,
      identityApi,
      // keep retries off to avoid masking failures
      retry: { maxAttempts: 1, backoffBaseMs: 1 },
      // small TTL for quick stale/hard-expire windows
      cacheTtlMs: 50,
      swr: { enabled: true, staleFactor: 2 }, // hard-expired at t0 + 100
      enableInternalCache: true,
    } as any);

    const events: Ev[] = [];
    const unsub = client.subscribeCacheEvents?.((e: Ev) => events.push(e)) as () => void;

    // Warm both keys at t=0 (no SWR events expected)
    await client.getOverview('P7D');
    await client.getOverview('P14D');
    expect(events.filter(e => e.type.startsWith('swr') || e.type === 'stale-serve')).toHaveLength(0);

    // Advance into stale window (expires at 50, hard-expired at 100)
    jest.setSystemTime(60);

    // Success scenario (P14D): should emit stale-serve -> start -> success
    await client.getOverview('P14D');
    // Allow background revalidation to settle
    for (let i = 0; i < 10; i++) await Promise.resolve();
    const p14 = events.filter(e => e.path === '/costs/daily?period=P14D').map(e => e.type);
    expect(p14.slice(0, 2)).toEqual(['stale-serve', 'swr-revalidate-start']);
    expect(p14).toContain('swr-revalidate-success');

    // Error scenario (P7D): should emit stale-serve -> start -> error
    await client.getOverview('P7D');
    // Wait until error event appears (poll microtasks a few times)
    for (let i = 0; i < 10; i++) {
      if (events.some(e => e.path === '/costs/daily?period=P7D' && e.type === 'swr-revalidate-error')) break;
      // drain microtasks
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }
    const p7 = events.filter(e => e.path === '/costs/daily?period=P7D').map(e => e.type);
    expect(p7.slice(0, 2)).toEqual(['stale-serve', 'swr-revalidate-start']);
    expect(p7).toContain('swr-revalidate-error');

    // Move beyond hard-expired (t >= 100) and access again to trigger swr-hard-expired
    jest.setSystemTime(110);
    await client.getOverview('P7D');
    const p7After = events.filter(e => e.path === '/costs/daily?period=P7D').map(e => e.type);
    expect(p7After).toContain('swr-hard-expired');

    unsub?.();
  });
});
