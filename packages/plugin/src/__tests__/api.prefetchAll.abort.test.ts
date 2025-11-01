import { CostscopeClient } from './client';
import { CostscopeErrorCodes } from './errorCodes';

describe('prefetchAll abort', () => {
  const base = {
    discoveryApi: { getBaseUrl: async () => 'http://example' },
    identityApi: { getCredentials: async () => ({ token: 't' }) },
  } as any;
  it('surfaces TIMEOUT when aborted externally', async () => {
    const fetchApi = { fetch: jest.fn((_url: string, opts: any) => new Promise((_r, j) => {
      const rejectFn = () => j({ name: 'AbortError' });
      if (opts?.signal?.aborted) { rejectFn(); return; }
      opts?.signal?.addEventListener('abort', rejectFn, { once: true });
    })) };
    const client = new CostscopeClient({ ...base, fetchApi, timeoutMs: 100, retry: { maxAttempts: 1 } });
    const controller = new AbortController();
    const p = client.prefetchAll({ period: 'P30D', signal: controller.signal });
    // Defer abort to ensure listeners registered
    await new Promise(resolve => setTimeout(() => { controller.abort(); resolve(void 0); }, 0));
    await expect(p).rejects.toMatchObject({ code: CostscopeErrorCodes.TIMEOUT });
  }, 3000);
});
