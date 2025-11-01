import { httpGet } from './transport';
import { CostscopeErrorCodes } from './errorCodes';

describe('transport timeout', () => {
  const discoveryApi = { getBaseUrl: async () => 'http://example.test' };
  const identityApi = { getCredentials: async () => ({ token: '' }) };
  it('retries TIMEOUT up to maxAttempts then throws', async () => {
    let calls = 0;
    const fetchApi = { fetch: async (_url: string, opts: any) => new Promise((_res, rej) => { calls += 1; opts.signal.addEventListener('abort', () => rej(new DOMException('Aborted','AbortError'))); }) };
    const deps: any = { discoveryApi, fetchApi, identityApi, largePayloadWarnedPaths: new Set() };
    await expect(httpGet('/alerts?', { timeoutMs: 5, retry: { maxAttempts: 2, retryOn: [], backoffBaseMs: 1 } }, deps, 'corr')).rejects.toMatchObject({ code: CostscopeErrorCodes.TIMEOUT });
    expect(calls).toBe(2);
  });
});
