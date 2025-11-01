import { CostscopeClient } from '../index';

function makeClientWithSequence(responses: Array<{ ok: boolean; status: number; json?: any }>) {
  const baseUrl = 'http://example.local';
  const discoveryApi = {
    async getBaseUrl() {
      return baseUrl;
    },
  } as any;
  const identityApi = {
    async getCredentials() {
      return { token: '' };
    },
  } as any;
  let i = 0;
  const fetchApi = {
    async fetch(url: string) {
      const r = responses[Math.min(i++, responses.length - 1)];
      return {
        ok: r.ok,
        status: r.status,
        async json() {
          return r.json ?? {};
        },
      } as any;
    },
  } as any;
  return new CostscopeClient({ discoveryApi, fetchApi, identityApi, enableInternalCache: false });
}

describe('health fallback', () => {
  it('falls back to /health when /healthz is 404', async () => {
    const client = makeClientWithSequence([
      { ok: false, status: 404 },
      { ok: true, status: 200, json: { status: 'ok' } },
    ]);
    const res = await client.health();
    expect((res as any).status).toBe('ok');
  });
});
