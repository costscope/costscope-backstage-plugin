import { httpGet } from './transport';
import { CostscopeErrorCodes } from './errorCodes';

describe('transport network error mapping', () => {
  const discoveryApi = { getBaseUrl: async () => 'http://x' };
  const identityApi = { getCredentials: async () => ({ token: '' }) };
  it('maps thrown pre-status error to NETWORK_ERROR', async () => {
    const fetchApi = { fetch: async () => { throw new Error('boom'); } };
    const deps: any = { discoveryApi, fetchApi, identityApi, largePayloadWarnedPaths: new Set() };
    await expect(httpGet('/alerts', { timeoutMs: 20, retry: { maxAttempts: 1, retryOn: [], backoffBaseMs: 1 } }, deps, 'c')).rejects.toMatchObject({ code: CostscopeErrorCodes.NETWORK_ERROR });
  });
});
