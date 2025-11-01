import { httpGet } from './transport';
import { CostscopeErrorCodes } from './errorCodes';

describe('transport (negative)', () => {
  const discoveryApi = { getBaseUrl: async () => 'http://example.test' };
  const identityApi = { getCredentials: async () => ({ token: '' }) };
  it('throws HTTP_ERROR for non-retry 500 response', async () => {
    let calls = 0;
    const fetchApi = { fetch: async () => { calls += 1; return { ok: false, status: 500, json: async () => ({}) }; } };
    const deps: any = { discoveryApi, fetchApi, identityApi, largePayloadWarnedPaths: new Set() };
    await expect(httpGet('/alerts', { timeoutMs: 10, retry: { maxAttempts: 2, retryOn: [502], backoffBaseMs: 1 } }, deps, 'corr'))
      .rejects.toMatchObject({ code: CostscopeErrorCodes.HTTP_ERROR, status: 500 });
    expect(calls).toBe(1); // no retry for 500 (not in retryOn)
  });
});
