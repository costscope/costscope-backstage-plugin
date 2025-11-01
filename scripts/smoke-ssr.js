/* eslint-env node */
/*
 SSR hydration smoke:
 1. Starts mock server (in-process).
 2. Fetches overview via CostscopeClient (server-side prefetch simulation).
 3. Builds a minimal prefetch manifest embedding the overview as P0.
 4. Hydrates a React Query client from the manifest (client-side simulation).
 5. Asserts cache contains data under the expected key and prints a JSON line.

 Usage: yarn smoke:ssr
*/

// Register ts-node for TS imports in this script runtime
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs', moduleResolution: 'node' } });
// Start the mock server (TS module)
require('./mock-server.ts');

(async () => {
  const { QueryClient } = require('@tanstack/react-query');
  const { CostscopeClient } = require('../src/client/index.ts');
  const { qk } = require('../src/queryKeys.ts');
  const { hydrateFromManifest } = require('../src/ssr/hydration.ts');

  const BASE = 'http://localhost:7007/api/costscope';
  const discoveryApi = { getBaseUrl: async () => BASE };
  const fetchApi = { fetch: (global.fetch ? global.fetch.bind(global) : (...args) => import('node-fetch').then(m => m.default(...args))) };
  const identityApi = { getCredentials: async () => ({ token: undefined }) };

  // Give mock server a moment to boot
  await new Promise(r => setTimeout(r, 150));

  // Server-side prefetch (simulate SSR building the manifest)
  const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi, timeoutMs: 5000, enableInternalCache: false, silent: true });
  const period = 'P7D';
  const project = '';
  const overview = await client.getOverview(period, { project });

  if (!Array.isArray(overview) || !overview.length) {
    console.error(JSON.stringify({ ok: false, stage: 'prefetch', error: 'Empty overview' }));
    process.exit(1);
  }

  const manifest = {
    version: 1,
    ts: Date.now(),
    params: { period, project },
    queries: [
      { key: qk.overview(period, project), endpoint: '/costs/daily', priority: 0, data: overview },
    ],
  };

  // Minimal document stub containing the inlined manifest tag
  const doc = {
    getElementById: (id) => {
      if (id !== 'costscope-prefetch') return null;
      return { tagName: 'SCRIPT', type: 'application/json', textContent: JSON.stringify(manifest) };
    },
  };

  // Client-side hydration
  const qc = new QueryClient();
  const returned = hydrateFromManifest(qc, doc);
  const cached = qc.getQueryData(qk.overview(period, project));

  const ok = !!returned && Array.isArray(cached) && cached.length === overview.length && typeof cached[0].date === 'string' && typeof cached[0].cost === 'number';
  if (!ok) {
    console.error(JSON.stringify({ ok: false, stage: 'hydrate', sample: cached && cached.slice ? cached.slice(0, 2) : cached }));
    process.exit(1);
  }

  console.error(JSON.stringify({ ok: true, hydrated: true, period, items: overview.length, first: overview[0] }));
  process.exit(0);
})().catch(e => { console.error(JSON.stringify({ ok: false, error: e && e.message || String(e) })); process.exit(1); });
