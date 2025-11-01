import { httpGet } from './transport';

describe('transport retry logic', () => {
  const discoveryApi = { getBaseUrl: async () => 'http://example.test' };
  const identityApi = { getCredentials: async () => ({ token: '' }) };
  it('retries on configured retryOn status then succeeds', async () => {
    let calls = 0;
    const fetchApi = { fetch: async () => { calls += 1; if (calls === 1) return { ok: false, status: 502, json: async () => ({}) }; return { ok: true, status: 200, json: async () => ({ ok: true, n: calls }) }; } };
    const deps: any = { discoveryApi, fetchApi, identityApi, largePayloadWarnedPaths: new Set() };
    const res = await httpGet('/costs/summary?period=P30D', { timeoutMs: 100, retry: { maxAttempts: 3, retryOn: [502], backoffBaseMs: 1 } }, deps, 'corr');
    expect(res).toEqual({ ok: true, n: 2 });
    expect(calls).toBe(2);
  });
});
