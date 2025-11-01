/* eslint-env node */
/*
 Simple smoke script (JS version to avoid ts-node ESM edge cases):
 1. Starts mock server (in-process require).
 2. Instantiates CostscopeClient (compiled TS source via ts-node not needed; we use src transpile by ts-node/register, but here we import built source path fallback). If dist not built we require src/api.ts through ts-node/register automatically if executed with TS support; instead we dynamically fall back.
*/

// Register ts-node to handle .ts imports (transpile-only for speed)
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs', moduleResolution: 'node' } });
// Start mock server (TS)
require('./mock-server.ts');

(async () => {
  const { CostscopeClient } = require('../src/client/index.ts');
  const BASE = 'http://localhost:7007/api/costscope';
  const discoveryApi = { getBaseUrl: async () => BASE };
  let lastCorrelationId;
  const fetchApi = { fetch: async (input, init) => { const h = (init && init.headers) || {}; if (h['x-correlation-id']) lastCorrelationId = h['x-correlation-id']; return (global.fetch || (await import('node-fetch')).default)(input, init); } };
  const identityApi = { getCredentials: async () => ({ token: undefined }) };
  await new Promise(r => setTimeout(r, 150));
  const client = new CostscopeClient({ discoveryApi, fetchApi, identityApi, timeoutMs: 5000 });
  const period = 'P7D';
  const data = await client.getOverview(period);
  const ok = Array.isArray(data) && data.length > 0 && typeof data[0].date === 'string' && typeof data[0].cost === 'number';
  if (!ok) {
    console.error(JSON.stringify({ ok: false, error: 'Bad shape', sample: data.slice(0, 2) }));
    process.exit(1);
  }
  console.error(JSON.stringify({ ok: true, period, items: data.length, first: data[0], correlationId: lastCorrelationId }));
  process.exit(0);
})().catch(e => { console.error(JSON.stringify({ ok: false, error: e.message })); process.exit(1); });
