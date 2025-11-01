import { CostscopeClient } from './client';

describe('CostscopeClient per-request validate option', () => {
  const discoveryApi = { getBaseUrl: async () => 'http://x.test' };
  const identityApi = { getCredentials: async () => ({ token: '' }) };

  function makeClient(fetchImpl: any) {
    return new CostscopeClient({
      discoveryApi,
      fetchApi: { fetch: fetchImpl },
      identityApi,
      errorApi: { post: () => {} },
      alertApi: { post: () => {} },
      timeoutMs: 50,
      retry: { maxAttempts: 1 },
    } as any);
  }

  const okOverview = [{ date: '2024-01-01', cost: 1 }];
  const badOverview = [{ date: '2024-01-01', cost: 'oops' }];

  beforeEach(() => { process.env.COSTSCOPE_RUNTIME_VALIDATE = 'false'; process.env.NODE_ENV = 'test'; });

  it('validates when validate:true (env false)', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => okOverview });
    const client = makeClient(fetchImpl);
    await expect(client.getOverview('P7D', { validate: true })).resolves.toEqual(okOverview);
  });

  it('skips validation when validate:false even if payload invalid', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => badOverview });
    const client = makeClient(fetchImpl);
    await expect(client.getOverview('P7D', { validate: false })).resolves.toEqual(badOverview as any);
  });
});
