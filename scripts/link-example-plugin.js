#!/usr/bin/env node
/**
 * Ensures the example backstage app resolves the local plugin workspace package.
 * Previous implementation pointed at repo root which caused recursive nesting when the
 * package itself depended on the example (via file: reference) or when pack/install tooling
 * traversed the symlink.
 * Now we link to packages/plugin explicitly to avoid a path that re-includes examples/.
 */
const fs = require('fs');
const path = require('path');

function ensureSymlink() {
  const appNodeModules = path.join(
    __dirname,
    '..',
    'examples',
    'backstage-app',
    'packages',
    'app',
    'node_modules',
  );
  // Scoped package path: node_modules/@costscope/backstage-plugin
  const scopeDir = path.join(appNodeModules, '@costscope');
  const linkPath = path.join(scopeDir, 'backstage-plugin');
  // Target the actual plugin package directory, not repo root.
  const pluginDir = path.join(__dirname, '..', 'packages', 'plugin');
  const target = path.relative(appNodeModules, pluginDir);
  if (!fs.existsSync(pluginDir)) {
    console.error('[link:example] plugin directory missing at', pluginDir);
    process.exit(1);
  }
  if (!fs.existsSync(scopeDir)) {
    fs.mkdirSync(scopeDir, { recursive: true });
  }
  try {
    if (fs.existsSync(linkPath)) {
      const stat = fs.lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        const current = fs.readlinkSync(linkPath);
        if (current === target) {
          console.log('[link:example] existing symlink OK');
          return;
        }
        fs.unlinkSync(linkPath);
      } else {
        // If a real folder somehow exists, rename it out of the way.
        const backup = linkPath + '.bak-' + Date.now();
        fs.renameSync(linkPath, backup);
        console.warn('[link:example] moved existing folder to', backup);
      }
    }
    fs.symlinkSync(target, linkPath, 'dir');
    console.log('[link:example] symlink created:', linkPath, '->', target);
  } catch (e) {
    console.error('[link:example] failed to create symlink', e);
    process.exitCode = 1;
  }
}

ensureSymlink();
