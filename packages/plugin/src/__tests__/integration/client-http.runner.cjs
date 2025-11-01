#!/usr/bin/env node
// CommonJS runner: register ts-node so we can require TypeScript modules, then
// execute the integration scenario.
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs', moduleResolution: 'node' } });
const express = require('express');
const _fetchPkg = require('node-fetch');
const fetch = _fetchPkg && (_fetchPkg.default || _fetchPkg);

function startUpstream() {
  const app = express();
  app.get('/api/costscope/providers', (_req, res) => res.json([{ id: 'aws', name: 'AWS' }]));
  app.get('/api/costscope/costs/daily', (_req, res) => res.json({ data: [], meta: {} }));
  app.get('/api/costscope/costs/summary', (_req, res) => res.json({ total: 0, breakdown: [] }));
  app.get('/api/costscope/healthz', (_req, res) => res.send('ok'));

  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = addr && typeof addr === 'object' ? addr.port : addr;
      resolve({ server, port, baseUrl: `http://127.0.0.1:${port}` });
    });
    server.on('error', reject);
  });
}

async function run() {
  const { server, baseUrl } = await startUpstream();
  try {
    const mod = require('../../client/index.ts');
    const CostscopeClient = mod && (mod.CostscopeClient || mod.default || mod);

    const client = new CostscopeClient({
      discoveryApi: { getBaseUrl: async () => baseUrl + '/api/costscope' },
  fetchApi: { fetch },
      identityApi: { getCredentials: async () => ({ token: '' }) },
      enableInternalCache: true,
      telemetry: () => {},
    });

    const providers = await client.getProviders({ validate: false });
    if (!Array.isArray(providers) || providers.length === 0) {
      console.error('providers missing or empty', providers);
      process.exit(2);
    }

    const overview = await client.getOverview('P30D', { validate: false });
    const summary = await client.getSummary('P30D', { validate: false });

    if (!overview || typeof overview !== 'object') {
      console.error('overview invalid', overview);
      process.exit(3);
    }
    if (!summary || typeof summary !== 'object') {
      console.error('summary invalid', summary);
      process.exit(4);
    }

    process.exit(0);
  } catch (e) {
    console.error('runner failed', e && e.stack ? e.stack : e);
    process.exit(5);
  } finally {
    if (server && typeof server.close === 'function') {
      server.close(() => {});
    }
  }
}

run();
