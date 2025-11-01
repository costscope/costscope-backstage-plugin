import { CostscopeClient } from './client';
import { CostscopeErrorCodes } from './errorCodes';

describe('critical override integration', () => {
  const base = {
    discoveryApi: { getBaseUrl: async () => 'http://example' },
    identityApi: { getCredentials: async () => ({ token: 't' }) },
    errorApi: { post: jest.fn() },
  } as any;

  it('HTTP 500 not critical when override restricts to TIMEOUT + 418', async () => {
    const alertApi = { post: jest.fn() };
    const fetchApi = { fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }) };
    const client = new CostscopeClient({ ...base, fetchApi, alertApi, critical: { statuses: [418], codes: [CostscopeErrorCodes.TIMEOUT] }, retry: { maxAttempts: 1 } });
    await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: CostscopeErrorCodes.HTTP_ERROR, status: 500 });
    expect(alertApi.post).not.toHaveBeenCalled();
  });

  it('TIMEOUT triggers alert when configured in critical.codes', async () => {
    const alertApi = { post: jest.fn() };
    const fetchApi = { fetch: jest.fn((_url: string, opts: any) => new Promise((_r, j) => { opts?.signal?.addEventListener('abort', () => j({ name: 'AbortError' })); })) };
    const client = new CostscopeClient({ ...base, fetchApi, alertApi, critical: { statuses: [418], codes: [CostscopeErrorCodes.TIMEOUT] }, timeoutMs: 10, retry: { maxAttempts: 1 } });
    await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: CostscopeErrorCodes.TIMEOUT });
    expect(alertApi.post).toHaveBeenCalledTimes(1);
  });
});
