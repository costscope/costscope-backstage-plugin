import { CostscopeClient } from './client';

describe('CostscopeClient silent mode', () => {
  // We use a simulated network error (no status) to exercise the alert path (NETWORK_ERROR is critical by default)
  const networkFailingFetch = { fetch: async () => { throw new Error('net'); } } as any;
  const baseOpts = () => ({
    discoveryApi: { async getBaseUrl(id: string) { return `http://localhost/${id}`; } } as any,
    identityApi: { getCredentials: async () => ({ token: 't' }) } as any,
    fetchApi: networkFailingFetch,
    // Reduce retries to 1 so we don't wait on backoff in tests (still triggers bottom error handling path)
    retry: { maxAttempts: 1 },
  });

  function makeFailingClient(extra: any = {}) {
    return new CostscopeClient({ ...baseOpts(), ...extra });
  }

  it('posts alert when not silent and critical (NETWORK_ERROR)', async () => {
    const alertCalls: any[] = [];
    const client = makeFailingClient({ alertApi: { post: (a: any) => alertCalls.push(a) } });
    await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(alertCalls.length).toBe(1);
    expect(alertCalls[0].message).toContain('Costscope error');
  });

  it('suppresses alert when silent=true', async () => {
    const alertCalls: any[] = [];
    const client = makeFailingClient({ alertApi: { post: (a: any) => alertCalls.push(a) }, silent: true });
    await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(alertCalls.length).toBe(0);
  });
});
