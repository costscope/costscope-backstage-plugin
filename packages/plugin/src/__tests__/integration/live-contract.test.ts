/** @jest-environment node */
/**
 * Real HTTP round-trip integration test using the built dist output of the plugin client.
 * Falls back to building the plugin (tsup) on first run if dist is missing.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'fs';
import path from 'path';
import express from 'express';

// Ensure dist build exists (idempotent). Build only once per test run for speed.
function ensureDist() {
  const distIndex = path.join(__dirname, '../../../dist/index.js');
  if (!fs.existsSync(distIndex)) {
    // Run build synchronously so subsequent require works.
    // Using execSync instead of spawning yarn script inside workspace for simplicity.
    // eslint-disable-next-line no-console
    console.log('[live-contract] dist missing – building plugin dist...');
    const cp = require('child_process');
    cp.execSync('yarn build', { cwd: path.join(__dirname, '../../..'), stdio: 'inherit' });
  }
  return distIndex;
}

// Lazy load CostscopeClient from built output (CJS entry) to avoid ts-jest type parsing issues.
function loadClient() {
  const distIndex = ensureDist();
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const exported = require(distIndex);
  return exported.CostscopeClient || exported.costscope?.CostscopeClient || exported.default?.CostscopeClient;
}

async function startUpstream() {
  const app = express();
  const provider = { id: 'aws', displayName: 'AWS', status: 'ok', services: 1, lastUpdated: new Date().toISOString() };
  const overview = [{ date: '2025-01-01', cost: 12.34 }];
  const summary = { period: 'P30D', project: 'proj-a', totalCost: 100, previousTotalCost: 90, deltaPct: 11.11, currency: 'USD' };
  app.get('/api/costscope/providers', (_req, res) => res.json([provider]));
  app.get('/api/costscope/costs/daily', (_req, res) => res.json(overview));
  app.get('/api/costscope/costs/summary', (_req, res) => res.json(summary));
  app.get('/api/costscope/healthz', (_req, res) => res.json({ ok: true }));
  await new Promise((resolve) => setTimeout(resolve, 10)); // minor delay to stabilize timing
  return await new Promise(resolve => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = addr && typeof addr === 'object' ? (addr as any).port : 0;
      resolve({ server, port, baseUrl: `http://127.0.0.1:${port}/api/costscope` });
    });
  });
}

describe('HTTP integration (dist client)', () => {
  jest.setTimeout(20000);
  let upstream;
  let ClientCtor: any;

  beforeAll(async () => {
    upstream = await startUpstream();
    ClientCtor = loadClient();
    if (!ClientCtor) throw new Error('CostscopeClient not found in dist build');
  });

  afterAll(async () => {
    await new Promise(res => upstream.server.close(res));
  });

  function createClient() {
    return new ClientCtor({
      discoveryApi: { getBaseUrl: async () => upstream.baseUrl },
      fetchApi: { fetch: (global as any).fetch.bind(global) },
      identityApi: { getCredentials: async () => ({ token: '' }) },
      enableInternalCache: true,
      telemetry: () => {},
    });
  }

  it('fetches providers / overview / summary with validation disabled', async () => {
    const client = createClient();
    const providers = await client.getProviders();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers[0].id).toBe('aws');
    const overview = await client.getOverview('P30D');
    expect(overview.length).toBe(1);
    const summary = await client.getSummary('P30D');
    expect(summary.totalCost).toBe(100);
  });

  it('supports cache refresh logic', async () => {
    const client = createClient();
    const first = await client.getOverview('P30D');
    expect(first.length).toBe(1);
    const second = await client.getOverview('P30D', { refresh: true });
    expect(second.length).toBe(1);
  });
});
