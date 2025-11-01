import { jest } from '@jest/globals';
import { CostscopeClient } from './client';

/**
 * Tiny test: verifies exponential backoff (no jitter) on NETWORK_ERROR -> success.
 */
describe('retry backoff on NETWORK_ERROR (no jitter)', () => {
  const base = {
    discoveryApi: { getBaseUrl: async () => 'http://example' },
    identityApi: { getCredentials: async () => ({ token: 't' }) },
  } as any;

  beforeEach(() => {
    (globalThis as any).process = { env: { NODE_ENV: 'development' } } as any;
  });

  it('applies base delay once when maxAttempts=2', async () => {
    const originalSetTimeout = global.setTimeout;
    const captured: number[] = [];
    (global as any).setTimeout = (fn: any, ms?: number) => {
      if (typeof ms === 'number') captured.push(ms);
      return originalSetTimeout(fn, 0) as any; // execute immediately to keep test fast
    };

    let calls = 0;
    const fetchApi = {
      fetch: jest.fn(async () => {
        calls += 1;
        if (calls === 1) {
          // Simulate a network-layer failure (no HTTP status)
          throw new TypeError('network failure');
        }
        return { ok: true, status: 200, json: async () => ([{ date: '2025-01-01', cost: 1 }]) };
      }),
    };

    const client = new CostscopeClient({
      ...base,
      fetchApi,
      retry: { maxAttempts: 2, backoffBaseMs: 120, jitterFactor: 0 },
    });

    const data = await client.getOverview('P1D');
    expect(data[0].cost).toBe(1);
    expect(fetchApi.fetch).toHaveBeenCalledTimes(2);

    // Filter out request timeouts (>=10_000ms); keep only retry backoff waits
    const delays = captured.filter(ms => typeof ms === 'number' && ms >= 100 && ms < 10_000);
    expect(delays).toEqual([120]);

    (global as any).setTimeout = originalSetTimeout;
  });
});
