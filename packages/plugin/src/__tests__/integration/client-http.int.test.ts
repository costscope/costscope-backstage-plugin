/** Node integration test: CostscopeClient HTTP round trip (providers/overview/summary). */
import express from 'express';
import { CostscopeClient } from '../../client';

async function startUpstream() {
  const app = express();
  const provider = { id: 'aws', displayName: 'AWS', status: 'ok', services: 1, lastUpdated: new Date().toISOString() };
  const overview = [{ date: '2025-01-01', cost: 12.34 }];
  const summary = { period: 'P30D', project: 'proj-a', totalCost: 100, previousTotalCost: 90, deltaPct: 11.11, currency: 'USD' };
  app.get('/api/costscope/providers', (_req, res) => res.json([provider]));
  app.get('/api/costscope/costs/daily', (_req, res) => res.json(overview));
  app.get('/api/costscope/costs/summary', (_req, res) => res.json(summary));
  app.get('/api/costscope/healthz', (_req, res) => res.json({ ok: true }));
  return await new Promise<{ server: any; port: number; baseUrl: string }>(resolve => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = addr && typeof addr === 'object' ? (addr as any).port : 0;
      resolve({ server, port, baseUrl: `http://127.0.0.1:${port}/api/costscope` });
    });
  });
}

describe('CostscopeClient HTTP (integration)', () => {
  jest.setTimeout(15000);
  let upstream: { server: any; port: number; baseUrl: string };

  beforeAll(async () => { upstream = await startUpstream(); });
  afterAll(async () => { await new Promise(r => upstream.server.close(r)); });

  function client() {
    return new CostscopeClient({
      discoveryApi: { getBaseUrl: async () => upstream.baseUrl },
      fetchApi: { fetch: (global as any).fetch.bind(global) },
      identityApi: { getCredentials: async () => ({ token: '' }) },
      enableInternalCache: true,
      telemetry: () => {},
    });
  }

  it('fetches providers / overview / summary', async () => {
    const c = client();
    const providers = await c.getProviders({ validate: true });
    expect(providers[0].id).toBe('aws');
    const overview = await c.getOverview('P30D', { validate: true });
    expect(overview.length).toBe(1);
    const summary = await c.getSummary('P30D', { validate: true });
    expect(summary.totalCost).toBe(100);
  });

  it('supports refresh bypassing cache', async () => {
    const c = client();
    await c.getOverview('P30D');
    const refreshed = await c.getOverview('P30D', { refresh: true });
    expect(refreshed.length).toBe(1);
  });
});
