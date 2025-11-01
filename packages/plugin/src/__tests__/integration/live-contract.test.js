/* @jest-environment node */
// Real HTTP round-trip integration test using built dist output (CJS) of the plugin client.
// Keeps to plain JS (CommonJS) to bypass ts-jest TypeScript parsing quirks.
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const express = require('express');

function pluginRoot() {
  // __dirname => packages/plugin/src/__tests__/integration
  return path.join(__dirname, '../../../');
}

function distIndexPath() {
  return path.join(pluginRoot(), 'dist/index.js');
}

function ensureDist() {
  const idx = distIndexPath();
    if (!fs.existsSync(idx)) {
      console.log('[live-contract] dist missing – building (yarn build)...');
      cp.execSync('yarn build', { cwd: pluginRoot(), stdio: 'inherit' });
    }
  return idx;
}

function loadClient() {
  ensureDist();
  // Primary: legacy per-folder client entry used by older builds
  const clientIdx = path.join(pluginRoot(), 'dist/client/index.js');
  if (fs.existsSync(clientIdx)) {
  const mod = require(clientIdx);
    if (typeof mod.CostscopeClient !== 'function') throw new Error('CostscopeClient missing in dist/client');
    return mod.CostscopeClient;
  }

  // Fallback: tsup often bundles everything into dist/index.js (single entry).
  const rootIdx = distIndexPath();
  if (!fs.existsSync(rootIdx)) throw new Error('dist/index.js missing after build');
  const mod = require(rootIdx);
  // Try a few common shapes for the export.
  const Candidate = mod.CostscopeClient || (mod.default && mod.default.CostscopeClient) || (mod.default && typeof mod.default === 'function' ? mod.default : null);
  if (typeof Candidate !== 'function') {
    throw new Error('CostscopeClient constructor not found in dist/index.js export');
  }
  return Candidate;
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
  return await new Promise(resolve => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = addr && typeof addr === 'object' ? addr.port : 0;
      resolve({ server, port, baseUrl: `http://127.0.0.1:${port}/api/costscope` });
    });
  });
}

describe('HTTP integration (dist client)', () => {
  jest.setTimeout(20000);
  let upstream;
  let CostscopeClient;

  beforeAll(async () => {
    upstream = await startUpstream();
  });

  afterAll(async () => {
    await new Promise(res => upstream.server.close(res));
  });

  function client() {
    return new CostscopeClient({
      discoveryApi: { getBaseUrl: async () => upstream.baseUrl },
      fetchApi: { fetch: global.fetch.bind(global) },
      identityApi: { getCredentials: async () => ({ token: '' }) },
      enableInternalCache: true,
      telemetry: () => {},
    });
  }

  function runRunner() {
  const nodeBin = process.execPath;
  const runner = path.join(__dirname, 'runner.ts');
    const pluginRootDir = path.join(__dirname, '../../../');
    // Run node with the ts-node ESM loader so runner.ts (ESM-style) can run directly.
    // Use the package-local ts-node ESM CLI to run the TypeScript runner.
  const launcher = path.join(__dirname, 'runner-bundle-client.cjs');
  const child = cp.spawn(process.execPath, [launcher], {
      cwd: pluginRootDir,
      env: { ...process.env, UPSTREAM_BASE: upstream.baseUrl, NODE_OPTIONS: (process.env.NODE_OPTIONS || '') + ' --experimental-vm-modules --experimental-specifier-resolution=node' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return new Promise((resolve, reject) => {
      let out = '';
      let err = '';
      child.stdout.on('data', d => (out += d.toString()));
      child.stderr.on('data', d => (err += d.toString()));
      child.on('close', code => {
        if (code === 0) return resolve({ ok: true, out, err });
        return reject(new Error(`runner exited ${code}\n${err}\n${out}`));
      });
    });
  }

  it('runs integration runner (real HTTP) via forked ts-node', async () => {
    const res = await runRunner();
    expect(res.ok).toBe(true);
  // runner prints JSON on the last line on success; yarn/ts-node may emit extra lines
    // The child may emit extra lines (yarn banner, warnings). Find the last
    // non-empty line that is valid JSON and parse that.
    const lines = res.out.trim().split(/\r?\n/).filter(Boolean);
    let parsed = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        parsed = JSON.parse(lines[i]);
        break;
      } catch (e) {
        // skip non-JSON lines
      }
    }
    if (!parsed) {
      throw new Error('No JSON result found in runner stdout:\n' + res.out + '\n\nSTDERR:\n' + res.err);
    }
    expect(parsed.ok).toBe(true);
  });

  // The real HTTP integration is exercised by the forked TypeScript runner
  // to avoid Jest parse-time TypeScript errors.
});
