#!/usr/bin/env node
/**
 * Recursion / self-nesting guard for costscope-backstage-plugin in example Backstage app.
 * Fails (exit 1) if a path like:
 *   examples/backstage-app/packages/app/node_modules/costscope-backstage-plugin/.../examples/backstage-app/packages/app/node_modules/costscope-backstage-plugin
 * is detected (indicates the plugin dragged the repository root including examples/).
 * Also validates that the example app's symlink points to packages/plugin (not repo root).
 *
 * Usage:
 *   node scripts/check-recursion.js
 * Add to CI to prevent publishing / building with a pathological install state.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const EX_APP_PLUGIN = path.join(
  ROOT,
  'examples',
  'backstage-app',
  'packages',
  'app',
  'node_modules',
  '@costscope',
  'backstage-plugin',
);
const EX_APP_NODE_MODULES = path.join(
  ROOT,
  'examples',
  'backstage-app',
  'packages',
  'app',
  'node_modules',
);
const EXPECTED_TARGET_SUFFIX = path.join('packages', 'plugin');

function log(msg) {
  console.log('[recursion-check]', msg);
}
function warn(msg) {
  console.warn('[recursion-check][warn]', msg);
}
function fail(msg, code = 1) {
  console.error('[recursion-check][fail]', msg);
  process.exitCode = code;
}

// Optional JSON output (machine readable)
const asJson = process.env.RECURSION_CHECK_JSON === '1';
const result = { ok: true, issues: [], recursionPaths: [], symlinkTarget: null };

try {
  if (!fs.existsSync(EX_APP_NODE_MODULES)) {
    log('Example app node_modules not present – skipping (treat as OK).');
    if (asJson) console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // Validate symlink target (if link)
  if (fs.existsSync(EX_APP_PLUGIN)) {
    try {
      const lst = fs.lstatSync(EX_APP_PLUGIN);
      if (lst.isSymbolicLink()) {
        const targetRaw = fs.readlinkSync(EX_APP_PLUGIN);
        const resolved = path.resolve(path.dirname(EX_APP_PLUGIN), targetRaw);
        result.symlinkTarget = resolved;
        if (!resolved.endsWith(EXPECTED_TARGET_SUFFIX)) {
          result.ok = false;
          result.issues.push('SYMLINK_TARGET');
          fail(
            `Symlink target mismatch: expected path ending with '${EXPECTED_TARGET_SUFFIX}' got '${resolved}'`,
            2,
          );
        } else {
          log('Symlink target OK -> ' + resolved);
        }
      } else {
        warn('Plugin path in example app is not a symlink (could be a copy); continuing checks.');
      }
    } catch (e) {
      warn('Error reading symlink: ' + e.message);
    }
  } else {
    warn('Plugin not installed under example app yet; skipping recursion scan.');
    if (asJson) console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // Recursion pattern detection: walk directories under example app node_modules with bounded depth.
  const MAX_DEPTH = 12; // sufficient for typical nested node_modules chain
  const targetPattern = path.join(
    'examples',
    'backstage-app',
    'packages',
    'app',
    'node_modules',
    '@costscope',
    'backstage-plugin',
  );
  function walk(dir, depth) {
    if (depth > MAX_DEPTH) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (!ent.isDirectory() && !ent.isSymbolicLink()) continue;
      const full = path.join(dir, ent.name);
      // Fast substring check – path containing pattern twice => recursion
      const idx = full.indexOf(targetPattern);
      if (idx !== -1) {
        const second = full.indexOf(targetPattern, idx + targetPattern.length);
        if (second !== -1) {
          result.ok = false;
          result.issues.push('RECURSION');
          result.recursionPaths.push(full);
          fail('Recursive nesting detected at: ' + full, 1);
          return; // Stop early on first detection
        }
      }
      // Prune if node_modules of unrelated packages may explode – keep limited depth
      walk(full, depth + 1);
      if (!result.ok) return;
    }
  }
  walk(EX_APP_NODE_MODULES, 0);

  if (result.ok) {
    log('No recursive nesting detected.');
  }
} catch (e) {
  result.ok = false;
  result.issues.push('ERROR');
  fail('Unexpected error: ' + e.stack, 3);
}

if (asJson) console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(process.exitCode || 1);
else process.exit(0);
