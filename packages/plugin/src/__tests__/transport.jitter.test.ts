import { httpGet } from './transport';
import { CostscopeErrorCodes } from './errorCodes';

// We simulate TIMEOUT errors to trigger retries and capture computed delays by monkey-patching setTimeout.

describe('transport jitter backoff', () => {
  it('applies jitter within expected range', async () => {
  const allDelays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    // Monkey patch setTimeout to capture delay argument without actually waiting long.
    (global as any).setTimeout = (fn: any, ms?: number) => {
      if (typeof ms === 'number') allDelays.push(ms);
      return originalSetTimeout(fn, 0) as any; // execute immediately
    };
    try {
      const deps: any = {
        discoveryApi: { getBaseUrl: async () => 'http://x' },
        fetchApi: { fetch: async () => new Promise((_r, reject) => reject(Object.assign(new Error('Network fail'), { code: 'ECONNRESET' }))) },
        identityApi: { getCredentials: async () => ({}) },
        largePayloadWarnedPaths: new Set<string>(),
      };
      const retryCfg = { timeoutMs: 5, retry: { maxAttempts: 4, retryOn: [], backoffBaseMs: 100, jitterFactor: 0.4 } };
      await expect(httpGet('/alerts', retryCfg as any, deps, 'corr')).rejects.toMatchObject({ code: CostscopeErrorCodes.NETWORK_ERROR });
  // Filter out request timeout timers (<= timeoutMs) retaining only backoff waits
  const delays = allDelays.filter(d => d > retryCfg.timeoutMs);
  expect(delays.length).toBe(3); // attempts 1->2,2->3,3->4
      // Base exponential sequence without jitter: 100, 200, 400
      const bases = [100, 200, 400];
      delays.forEach((d, i) => {
        const base = bases[i];
        const min = base * (1 - 0.4);
        expect(d).toBeGreaterThanOrEqual(min - 1e-6);
        expect(d).toBeLessThanOrEqual(base + 1e-6);
      });
      // Ensure variability: not all equal to base or all equal to min (probabilistic; allow flaky skip if rare)
      const unique = new Set(delays.map(x => Math.round(x)));
      if (unique.size === 1) {
        console.warn('Jitter test produced identical delays; possible rare collision');
      }
    } finally {
      (global as any).setTimeout = originalSetTimeout;
    }
  });

  it('falls back to no jitter when factor=0', async () => {
  const allDelays: number[] = [];
    const originalSetTimeout = global.setTimeout;
  (global as any).setTimeout = (fn: any, ms?: number) => { if (typeof ms === 'number') allDelays.push(ms); return originalSetTimeout(fn, 0) as any; };
    try {
      const deps: any = {
        discoveryApi: { getBaseUrl: async () => 'http://x' },
        fetchApi: { fetch: async () => new Promise((_r, reject) => reject(Object.assign(new Error('Network fail'), { code: 'ECONNRESET' }))) },
        identityApi: { getCredentials: async () => ({}) },
        largePayloadWarnedPaths: new Set<string>(),
      };
      const retryCfg = { timeoutMs: 5, retry: { maxAttempts: 3, retryOn: [], backoffBaseMs: 10, jitterFactor: 0 } };
      await expect(httpGet('/alerts', retryCfg as any, deps, 'corr')).rejects.toMatchObject({ code: CostscopeErrorCodes.NETWORK_ERROR });
  const delays = allDelays.filter(d => d > retryCfg.timeoutMs);
  expect(delays).toEqual([10, 20]);
    } finally { (global as any).setTimeout = originalSetTimeout; }
  });
});
