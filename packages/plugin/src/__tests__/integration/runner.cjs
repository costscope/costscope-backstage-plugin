// Launcher that exercises the built dist/index.js to run integration assertions.
// This avoids TypeScript/ts-node complexities during CI-local runs.
const path = require('path');
const fs = require('fs');

async function main() {
  const upstream = process.env.UPSTREAM_BASE;
  if (!upstream) {
    console.error('UPSTREAM_BASE not provided');
    process.exit(2);
  }

  const pluginRoot = path.join(__dirname, '../../../');
  const distIdx = path.join(pluginRoot, 'dist/index.js');
  if (!fs.existsSync(distIdx)) {
    console.error('dist/index.js not found; run `yarn build` in package/plugin');
    process.exit(3);
  }

  // Require the built bundle and attempt to find CostscopeClient
  const mod = require(distIdx);
  const CostscopeClient = mod.CostscopeClient || (mod.default && mod.default.CostscopeClient) || (mod.default && typeof mod.default === 'function' ? mod.default : null);
  if (typeof CostscopeClient !== 'function') {
    console.error('CostscopeClient constructor not found in dist export');
    process.exit(4);
  }

  try {
    const client = new CostscopeClient({
      discoveryApi: { getBaseUrl: async () => upstream },
      fetchApi: { fetch: global.fetch.bind(global) },
      identityApi: { getCredentials: async () => ({ token: '' }) },
      enableInternalCache: true,
      telemetry: () => {},
    });

    const providers = await client.getProviders();
    if (!Array.isArray(providers) || providers[0]?.id !== 'aws') throw new Error('providers mismatch');
    const ov = await client.getOverview('P30D');
    if (!Array.isArray(ov) || ov.length !== 1) throw new Error('overview mismatch');
    const su = await client.getSummary('P30D');
    if (!su || su.totalCost !== 100) throw new Error('summary mismatch');

    const first = await client.getOverview('P30D');
    const second = await client.getOverview('P30D', { refresh: true });
    if (!Array.isArray(second) || second.length !== first.length) throw new Error('refresh mismatch');

    console.log(JSON.stringify({ ok: true }));
    process.exit(0);
  } catch (err) {
    console.error('runner error', err && err.stack || err);
    process.exit(5);
  }
}

main();
