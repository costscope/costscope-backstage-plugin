#!/usr/bin/env node
/**
 * Sync example host app dependencies on @costscope/backstage-plugin to the current plugin version.
 * Intended for use after changeset version bumps (can be wired into pre-commit or CI).
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pluginPkgPath = path.join(root, 'packages', 'plugin', 'package.json');
const targets = [
  path.join(root, 'examples', 'backstage-app', 'packages', 'app', 'package.json'),
  path.join(root, 'examples', 'minimal-app', 'package.json'),
];

function load(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function save(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

const pluginPkg = load(pluginPkgPath);
const version = pluginPkg.version;
let changed = 0;

for (const pkgPath of targets) {
  if (!fs.existsSync(pkgPath)) continue;
  const pkg = load(pkgPath);
  if (
    pkg.dependencies &&
    pkg.dependencies['@costscope/backstage-plugin'] &&
    pkg.dependencies['@costscope/backstage-plugin'] !== version
  ) {
    pkg.dependencies['@costscope/backstage-plugin'] = version.startsWith('0.')
      ? `^${version}`
      : `^${version}`; // keep caret for semver minor bumps
    save(pkgPath, pkg);
    console.log('[sync-examples] updated', pkg.name, 'to', version);
    changed++;
  }
}

if (!changed) {
  console.log('[sync-examples] no example dependency updates needed');
}
