import { CostscopeClient } from './client';

describe('CostscopeClient.isCritical (configurable)', () => {
  const baseOpts = () => ({
    discoveryApi: { async getBaseUrl(id: string) { return `http://localhost/${id}`; } } as any,
    fetchApi: { fetch: async () => ({ ok: true, json: async () => [] }) } as any,
    identityApi: { getCredentials: async () => ({ token: 't' }) } as any,
  });

  function makeError(overrides: Partial<any>): any {
    return {
      __costscope: true,
      name: 'CostscopeError',
      code: 'UNKNOWN',
      message: 'x',
      attempt: 1,
      correlationId: 'c',
      path: '/x',
      ...overrides,
    };
  }

  it('default heuristic works (>=500)', () => {
    const client: any = new CostscopeClient(baseOpts());
    expect(client['isCritical'](makeError({ status: 500, code: 'HTTP_ERROR' }))).toBe(true);
    expect(client['isCritical'](makeError({ status: 404, code: 'HTTP_ERROR' }))).toBe(false);
  });

  it('config overrides heuristic – only configured statuses/codes trigger', () => {
    const client: any = new CostscopeClient({ ...baseOpts(), critical: { statuses: [418], codes: ['TIMEOUT'] } });
    expect(client['isCritical'](makeError({ status: 500, code: 'HTTP_ERROR' }))).toBe(false); // not configured
    expect(client['isCritical'](makeError({ status: 418, code: 'HTTP_ERROR' }))).toBe(true); // configured status
    expect(client['isCritical'](makeError({ code: 'TIMEOUT' }))).toBe(true); // configured code
  });

  it('empty config means nothing is critical', () => {
    const client: any = new CostscopeClient({ ...baseOpts(), critical: { statuses: [], codes: [] } });
    expect(client['isCritical'](makeError({ status: 500, code: 'HTTP_ERROR' }))).toBe(false);
    expect(client['isCritical'](makeError({ code: 'TIMEOUT' }))).toBe(false);
  });
});
