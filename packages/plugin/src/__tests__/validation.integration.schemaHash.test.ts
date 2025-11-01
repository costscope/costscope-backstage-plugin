import { CostscopeClient } from './client';
import { CostscopeErrorCodes } from './errorCodes';
import { computeSchemaHash } from './validation';

describe('runtime validation integration', () => {
  const prevEnv = { ...process.env };
  beforeAll(() => { process.env.COSTSCOPE_RUNTIME_VALIDATE = 'true'; process.env.NODE_ENV = 'test'; });
  afterAll(() => { process.env = prevEnv as any; });

  const base = {
    discoveryApi: { getBaseUrl: async () => 'http://example' },
    identityApi: { getCredentials: async () => ({ token: 't' }) },
  } as any;

  it('VALIDATION_ERROR includes schemaHash', async () => {
    const fetchApi = { fetch: async (url: string) => {
      if (url.includes('/costs/daily')) return { ok: true, json: async () => [{ date: '2025-01-01', cost: 1 }] } as any; // first call loads schemas
      if (url.includes('/breakdown')) return { ok: true, json: async () => [{ dim: 'X', cost: 1, deltaPct: 'oops' }] } as any; // invalid deltaPct
      if (url.includes('/alerts')) return { ok: true, json: async () => [] } as any;
      return { ok: true, json: async () => ({}) } as any;
    } };
    const client = new CostscopeClient({ ...base, fetchApi, retry: { maxAttempts: 1 } });
    // Warm schemas with valid overview
    await client.getOverview('P7D');
    const expectedHash = computeSchemaHash();
    expect(expectedHash).not.toBe('00000000');
    await expect(client.getBreakdown('ServiceCategory', 'P7D')).rejects.toMatchObject({ code: CostscopeErrorCodes.VALIDATION_ERROR, schemaHash: expectedHash });
  });
});
