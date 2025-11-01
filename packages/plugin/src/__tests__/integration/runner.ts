/* ESM-compatible runner for HTTP integration tests.
   Executed by the test harness with:
     node --loader ts-node/esm src/__tests__/integration/runner.ts

   The process CWD is set by the test to the package root so we can
   dynamically import the source client at 'src/client/index.ts'.
*/
import path from 'path';
import { pathToFileURL } from 'url';

import express from 'express';

export async function main() {
  const app = express();
  const provider = { id: 'aws', displayName: 'AWS', status: 'ok', services: 1, lastUpdated: new Date().toISOString() };
  const overview = [{ date: '2025-01-01', cost: 12.34 }];
  const summary = { period: 'P30D', project: 'proj-a', totalCost: 100, previousTotalCost: 90, deltaPct: 11.11, currency: 'USD' };
  app.get('/api/costscope/providers', (_req, res) => res.json([provider]));
  app.get('/api/costscope/costs/daily', (_req, res) => res.json(overview));
  app.get('/api/costscope/costs/summary', (_req, res) => res.json(summary));
  app.get('/api/costscope/healthz', (_req, res) => res.json({ ok: true }));

  const server = await new Promise<import('http').Server>(resolve => {
    const s = app.listen(0, () => resolve(s));
  });

  try {
    const addr = server.address() as any;
    const port = addr && typeof addr === 'object' ? addr.port : 0;
    const baseUrl = `http://127.0.0.1:${port}/api/costscope`;

    // load source client from package cwd (test sets cwd to package root)
    const clientPath = path.resolve(process.cwd(), 'src/client/index.ts');
    let mod: any;
    // If running under ts-node register (CJS), prefer require() so ts-node handles .ts files.
    if (typeof require === 'function') {
      mod = require(clientPath);
    } else {
      mod = await import(pathToFileURL(clientPath).href);
    }
    const CostscopeClient = mod.CostscopeClient || (mod.default && mod.default.CostscopeClient) || (mod.default && typeof mod.default === 'function' ? mod.default : null);
    if (typeof CostscopeClient !== 'function') {
      console.error('CostscopeClient constructor not found in source export');
      process.exit(2);
    }

    const client = new CostscopeClient({
      discoveryApi: { getBaseUrl: async () => baseUrl },
      fetchApi: { fetch: (global as any).fetch.bind(global) },
      identityApi: { getCredentials: async () => ({ token: '' }) },
      enableInternalCache: true,
      telemetry: () => {},
    });

    // test 1: basic fetches
    const providers = await client.getProviders();
    if (!Array.isArray(providers) || providers[0]?.id !== 'aws') throw new Error('providers mismatch');
    const ov = await client.getOverview('P30D');
    if (!Array.isArray(ov) || ov.length !== 1) throw new Error('overview mismatch');
    const su = await client.getSummary('P30D');
    if (!su || su.totalCost !== 100) throw new Error('summary mismatch');

    // test 2: refresh bypass
    const first = await client.getOverview('P30D');
    const second = await client.getOverview('P30D', { refresh: true });
    if (!Array.isArray(second) || second.length !== first.length) throw new Error('refresh mismatch');

    console.log(JSON.stringify({ ok: true }));
    process.exit(0);
  } catch (err: any) {
    console.error('runner error', err && (err.stack || err.message) || err);
    process.exit(3);
  } finally {
    server.close();
  }
}

// run immediately when executed directly
try {
  if (typeof require === 'function' && require.main === module) {
    // Called as a script
    void main();
  }
} catch (e) {
  // require may not be defined in some loader contexts; ignore
}
