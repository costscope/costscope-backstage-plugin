import express from 'express';
import http from 'http';

import { CostscopeClient } from './client';
import { buildPath } from './buildPath';
import { getRetryAttemptRecords, clearRetryAttemptRecords } from './retryTelemetry';

// Minimal Backstage API stubs -------------------------------------------------
class StubDiscoveryApi {
  constructor(private readonly baseUrl: string) {}
  async getBaseUrl(_pluginId: string) { return this.baseUrl; }
}
// Custom lightweight fetch implementation using Node http/https so we don't rely on jsdom/global fetch.
class StubFetchApi {
  async fetch(input: any, init?: any): Promise<any> {
    const url = typeof input === 'string' ? new URL(input) : new URL(input.url);
    const isHttps = url.protocol === 'https:';
    const mod = require(isHttps ? 'https' : 'http');
    const method = (init?.method || 'GET').toUpperCase();
    const headers = init?.headers || {};
    return new Promise((resolve, reject) => {
      const req = mod.request(
        {
          method,
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
          headers,
        },
        (res: any) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf-8');
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: async () => JSON.parse(body || 'null'),
            });
          });
        },
      );
      req.on('error', reject);
      if (init?.body) req.write(init.body);
      req.end();
    });
  }
}
class StubIdentityApi { async getCredentials() { return { token: undefined }; } }

// ----------------------------------------------------------------------------

describe('CostscopeClient retry integration (502 -> success)', () => {
  let server: http.Server;
  let port: number;
  let attempt = 0;

  beforeAll(async () => {
    (globalThis as any).process = { env: { NODE_ENV: 'development' } } as any;
    clearRetryAttemptRecords();
    const app = express();
    // Endpoint that fails first with 502 then succeeds.
    app.get('/api/costscope/costs/daily', (_req, res) => {
      attempt += 1;
      if (attempt === 1) {
        return res.status(502).json({ error: 'temporary upstream failure' });
      }
      const today = new Date();
      const d1 = new Date(today.getTime() - 24*3600*1000).toISOString().slice(0,10);
      const d2 = today.toISOString().slice(0,10);
      return res.json([
        { date: d1, cost: 100 },
        { date: d2, cost: 120 },
      ]);
    });
    await new Promise<void>(resolve => {
      server = app.listen(0, () => { port = (server.address() as any).port; resolve(); });
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('retries once on 502 and then succeeds', async () => {
  const baseUrl = `http://127.0.0.1:${port}/api/costscope`;
    const client = new CostscopeClient({
      discoveryApi: new StubDiscoveryApi(baseUrl) as any,
      fetchApi: new StubFetchApi() as any,
      identityApi: new StubIdentityApi() as any,
      retry: { maxAttempts: 3, retryOn: [502], backoffBaseMs: 1 }, // small backoff for test speed
      timeoutMs: 5_000,
    });

    const period = 'P2D';
    const data = await client.getOverview(period);

    expect(data.length).toBe(2);
    expect(attempt).toBe(2); // one failure (502) + one success

    const path = buildPath('/costs/daily', { period });
    const recs = getRetryAttemptRecords().filter(r => r.path === path);
    expect(recs.length).toBe(1);
    expect(recs[0].attempts).toBe(2);
    expect(recs[0].success).toBe(true);
  });
});
