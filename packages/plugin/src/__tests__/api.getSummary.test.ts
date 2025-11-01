import { CostscopeClient } from './client';

describe('CostscopeClient.getSummary', () => {
  const base = {
    discoveryApi: { getBaseUrl: async () => 'http://example' },
    identityApi: { getCredentials: async () => ({ token: 't' }) },
  } as any;

  it('returns typed summary on success', async () => {
    const fetchApi = {
      fetch: async () => ({
        ok: true,
        status: 200,
  json: async () => ({ period: 'P7D', totalCost: 123.45, prevPeriodCost: 111.11, deltaPct: 0.1111, currency: 'USD' }),
      }),
    } as any;
    const client = new CostscopeClient({ ...base, fetchApi });
    const summary = await client.getSummary!('P7D');
    expect(summary).toMatchObject({ period: 'P7D', currency: 'USD' });
    expect(typeof summary.totalCost).toBe('number');
  });

  it('throws HTTP_ERROR on non-ok status', async () => {
    const fetchApi = { fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }) } as any;
    const client = new CostscopeClient({ ...base, fetchApi, retry: { maxAttempts: 1 } });
    await expect(client.getSummary!('P30D')).rejects.toMatchObject({ code: 'HTTP_ERROR', status: 500 });
  });
});
