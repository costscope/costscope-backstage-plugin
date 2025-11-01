#!/usr/bin/env node
/* Fast incremental Jest runner for pre-commit and local rapid cycles.
 * Features:
 *  - Collect staged TS/TSX files (or changed vs HEAD if none staged)
 *  - Derive related tests via jest --findRelatedTests
 *  - Pattern filtering to exclude slow/integration suites unless ALWAYS_SLOW=1
 *  - Fallback smoke tests when list empty (ensures minimal regression net)
 *  - Optional heap logging (FAST_HEAP=1)
 *  - Stable explicit cache directory to improve warm performance
 *  - Skips mock server startup by setting FAST_TESTS=1 (global setup respects this)
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const pkgRoot = path.resolve(__dirname, '..');

function gitList(baseCmd) {
  try {
    const out = execSync(baseCmd, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (!out) return [];
    return out.split(/\n+/).filter(f => f);
  } catch {
    return [];
  }
}

// 1. Gather candidate changed files
let changed = gitList('git diff --cached --name-only');
if (changed.length === 0) {
  changed = gitList('git diff --name-only HEAD');
}

// Filter to TS/TSX source files inside plugin
const srcChanged = changed.filter(f => (/^packages\/plugin\//.test(f)) && /\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f));

// Map changed source files to absolute paths (required by jest --findRelatedTests sometimes)
const absChanged = srcChanged.map(f => path.join(repoRoot, f));

// 2. Build base jest args
const jestBin = path.join(repoRoot, 'node_modules', '.bin', 'jest');
const baseArgs = ['--passWithNoTests', '--coverage=false'];

if (process.env.FAST_HEAP) {
  baseArgs.push('--logHeapUsage');
}

// 3. Derive related tests
let relatedTests = [];
if (absChanged.length > 0) {
  try {
    const res = spawnSync(process.execPath, [jestBin, '--listTests', '--findRelatedTests', ...absChanged], { cwd: pkgRoot, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    if (res.status === 0) {
      relatedTests = res.stdout.toString().trim().split(/\n+/).filter(Boolean);
    }
  } catch (e) {
    // ignore and fallback
  }
}

// 4. Filter out slow/integration tests unless ALWAYS_SLOW=1
const slowPatterns = [
  '/transport.',
  '/validation.',
  '.integration.',
  '.metrics.',
  'descriptor.hash',
  'smoke-ssr',
];
if (!process.env.ALWAYS_SLOW) {
  relatedTests = relatedTests.filter(t => !slowPatterns.some(p => t.includes(p)));
}

// 5. Fallback smoke list (fast, deterministic)
if (relatedTests.length === 0) {
  const fallback = [
    'packages/plugin/src/utils/__tests__/queryKeys.test.ts',
    'packages/plugin/src/utils/__tests__/projectParams.test.ts',
    'packages/plugin/src/utils/__tests__/downsample.test.ts',
  ];
  relatedTests = fallback.map(f => path.join(repoRoot, f)).filter(f => fs.existsSync(f));
  process.stdout.write('[fast-tests] Using fallback smoke suite (no related tests found)\n');
}

// 6. Determine if any selected tests require mock server (heuristic: tests outside utils/ OR contain transport/validation)
let needServer = false;
for (const t of relatedTests) {
  if (/transport|validation|telemetry|integration|ssr/.test(t) && !process.env.ALWAYS_SLOW) {
    // These were filtered above unless ALWAYS_SLOW; keep heuristic simple
  }
  if (!/\/utils\//.test(t)) {
    needServer = true;
    break;
  }
}

// Global setup checks FAST_TESTS; set only if server not needed
if (!needServer) {
  process.env.FAST_TESTS = '1';
} else {
  process.stdout.write('[fast-tests] Detected tests that may require mock server startup.\n');
}

// 7. Stable cache directory
process.env.JEST_CACHE_DIR = process.env.JEST_CACHE_DIR || path.join(repoRoot, 'temp', '.jest-cache');
fs.mkdirSync(process.env.JEST_CACHE_DIR, { recursive: true });

// 8. Run Jest
const finalArgs = baseArgs.concat(relatedTests);
const env = { ...process.env, SKIP_COVERAGE: '1', CI: process.env.CI || '' };

process.stdout.write('[fast-tests] Running Jest with ' + relatedTests.length + ' test file(s).\n');
if (process.env.FAST_HEAP) process.stdout.write('[fast-tests] Heap usage logging enabled.\n');
if (process.env.ALWAYS_SLOW) process.stdout.write('[fast-tests] Slow test filtering disabled (ALWAYS_SLOW=1).\n');

const result = spawnSync(process.execPath, [jestBin, ...finalArgs], { cwd: pkgRoot, env, stdio: 'inherit' });
process.exit(result.status == null ? 1 : result.status);
