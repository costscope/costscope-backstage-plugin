#!/usr/bin/env node
/*
 * Checks whether temporary security-related resolutions overrides are still needed.
 * Logic: define a map of packages -> minimal safe semver. If installed version >= safe
 * and upstream (non-resolution) version would also satisfy, suggest removal.
 */
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const resolutionSafeMin = {
  linkifyjs: '4.3.2',
  koa: '2.16.2',
  '@octokit/request': '8.4.1',
  '@octokit/request-error': '5.1.1',
  '@octokit/plugin-paginate-rest': '9.2.2',
  prismjs: '1.30.0',
};

function getInstalledVersion(name) {
  try {
    const pkgJsonPath = require.resolve(path.join(name, 'package.json'), { paths: [root] });
    return JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')).version;
  } catch (e) {
    return null;
  }
}

// Basic semver compare (major.minor.patch only)
function gte(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return true;
}

const resolutions = pkg.resolutions || {};
const suggestions = [];

for (const [name, minSafe] of Object.entries(resolutionSafeMin)) {
  const installed = getInstalledVersion(name);
  if (!installed) {
    continue;
  }
  const hasResolution = Object.prototype.hasOwnProperty.call(resolutions, name);
  if (!hasResolution) continue; // Only evaluate overrides
  if (gte(installed.replace(/^v/, ''), minSafe)) {
    suggestions.push({ name, installed, minSafe });
  }
}

if (suggestions.length === 0) {
  console.log('No removable security resolutions detected.');
  process.exit(0);
}

console.log('Potentially removable resolutions (installed >= safe min):');
for (const s of suggestions) {
  console.log(` - ${s.name} (installed ${s.installed} >= ${s.minSafe})`);
}
console.log('\nNext step: verify upstream Backstage deps specify a compatible range, then remove from package.json and re-run yarn install + yarn audit.');
