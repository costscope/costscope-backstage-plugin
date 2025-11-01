import { CostscopeClient } from './client';

/**
 * Ensures external AbortSignal provided via options.signal aborts the request without retries.
 */
describe('CostscopeClient AbortSignal', () => {
  it('aborts once (no retries) when external signal triggered', async () => {
    const discoveryApi = { getBaseUrl: async () => 'http://example' };
    const identityApi = { getCredentials: async () => ({ token: '' }) };
    let attempts = 0;
    const fetchApi = {
      fetch: async (_url: string, opts: any) => new Promise((_resolve, reject) => {
        attempts += 1;
        // Simulate long request never resolving unless aborted
        if (opts?.signal) {
          opts.signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          });
        }
      }),
    };
    const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi, timeoutMs: 10_000, retry: { maxAttempts: 3, backoffBaseMs: 1 } });
    const controller = new AbortController();
  const p = client.getOverview('P1D', { signal: controller.signal });
  await new Promise(resolve => setTimeout(() => { controller.abort(); resolve(void 0); }, 0));
    await expect(p).rejects.toMatchObject({ code: 'TIMEOUT', attempt: 1 });
    expect(attempts).toBe(1);
  });
});
