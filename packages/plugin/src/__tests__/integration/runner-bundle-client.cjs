const path = require('path');
const fs = require('fs');
const { buildSync } = require('esbuild');

async function main() {
  const pkgRoot = process.cwd();
  const entry = path.join(pkgRoot, 'src', 'client', 'index.ts');
  const outDir = path.join(pkgRoot, 'temp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'client.bundled.cjs');

  try {
    buildSync({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: outFile,
      sourcemap: false,
      external: ['react', 'react-dom', 'react/jsx-runtime', 'recharts', '@backstage/plugin-catalog-react'],
      target: ['node20'],
    });
  } catch (e) {
    console.error('esbuild failed', e && (e.stack || e.message) || e);
    process.exit(2);
  }

  try {
    const mod = require(outFile);
    const CostscopeClient = mod.CostscopeClient || (mod.default && mod.default.CostscopeClient) || (mod.default && typeof mod.default === 'function' ? mod.default : null);
    if (typeof CostscopeClient !== 'function') {
      console.error('CostscopeClient constructor not found in bundled client export');
      process.exit(3);
    }

    const upstream = process.env.UPSTREAM_BASE;
    if (!upstream) {
      console.error('UPSTREAM_BASE not provided');
      process.exit(4);
    }

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
    console.error('bundled-runner error', err && (err.stack || err.message) || err);
    process.exit(5);
  }
}

main();
