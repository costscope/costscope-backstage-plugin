#!/usr/bin/env node
// Demo wrapper adding optional --reset behavior and delegating to existing scripts
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Monorepo root is three levels up from this script (packages/plugin/scripts)
const repoRoot = path.join(__dirname, '..', '..', '..');
const appRoot = path.join(repoRoot, 'examples', 'backstage-app');
const tmpNodeModulesCache = path.join(appRoot, 'packages', 'app', 'node_modules', '.cache');
const args = process.argv.slice(2);
const isReset = args.includes('--reset');
const isFrontendOnly = args.includes('--frontend-only');

function run(cmd, opts = {}) {
  const [bin, ...rest] = cmd.split(' ');
  const res = spawnSync(bin, rest, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

if (isReset) {
  try {
    // Remove example app caches to avoid stale state across runs
    if (existsSync(tmpNodeModulesCache))
      rmSync(tmpNodeModulesCache, { recursive: true, force: true });
  } catch (e) {
    // non-fatal
    if (process.env.DEBUG) console.warn('[demo] reset warning:', e?.message || e);
  }
}

// Optional validation-only mode for tests/CI to ensure paths resolve as expected
if (process.env.DEMO_VALIDATE_ONLY === '1') {
  const pluginDir = path.join(repoRoot, 'packages', 'plugin');
  const pkgJson = path.join(pluginDir, 'package.json');
  if (!existsSync(pluginDir) || !existsSync(pkgJson)) {
    console.error('[demo] validation failed: plugin dir not found at', pluginDir);
    process.exit(2);
  }
  process.exit(0);
}

if (isFrontendOnly) {
  run('npm run demo:front:inner', { cwd: path.join(repoRoot, 'packages', 'plugin') });
} else {
  // Default port layout: MOCK_PORT=7007 (upstream), PORT=7008 (proxy), APP_PORT=3000 (frontend)
  const env = { ...process.env, MOCK_PORT: process.env.MOCK_PORT || '7007', PORT: process.env.PORT || process.env.BACKEND_PORT || '7008', APP_PORT: process.env.APP_PORT || '3000' };
  run('npm run demo:inner', { cwd: path.join(repoRoot, 'packages', 'plugin'), env });
}
