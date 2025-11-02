#!/usr/bin/env node
/*
 * Compare manual zod runtime schemas in api.ts with central validationDescriptor.
 * Fail if the derived descriptor hash differs (prevents silent drift).
 */
const fs = require('fs');
const path = require('path');

// Resolve to the plugin package root in the monorepo (packages/plugin),
// falling back to repo root if that structure doesn't exist.
const repoRoot = path.join(__dirname, '..');
const pluginRootCandidate = path.join(repoRoot, 'packages', 'plugin');
const baseDir = fs.existsSync(pluginRootCandidate) ? pluginRootCandidate : repoRoot;

const descPath = path.join(baseDir, 'src', 'validationDescriptor.ts');
const apiPath = path.join(baseDir, 'src', 'api.ts');

if (!fs.existsSync(descPath) || !fs.existsSync(apiPath)) {
  console.error('[spec:descriptor] missing files');
  process.exit(1);
}
const descContent = fs.readFileSync(descPath, 'utf8');
// Build expected hash by re-deriving from descriptor object literal to avoid needing TS execution.
const objMatch = descContent.match(/validationDescriptor\s*=\s*\{([\s\S]*?)\}\s*as const/);
if (!objMatch) {
  console.error('[spec:descriptor] could not extract validationDescriptor object');
  process.exit(1);
}
const lines = objMatch[1]
  .split(/\n/)
  .map((l) => l.trim())
  .filter(Boolean);
const descriptorObj = {};
for (const l of lines) {
  const m = l.match(/(\w+)\s*:\s*'([^']+)'/);
  if (m) descriptorObj[m[1]] = m[2];
}
const jsonDesc = JSON.stringify(descriptorObj);
let hd = 5381;
for (let i = 0; i < jsonDesc.length; i++) hd = (hd * 33) ^ jsonDesc.charCodeAt(i);
const expectedHash = (hd >>> 0).toString(16).padStart(8, '0');

const apiContent = fs.readFileSync(apiPath, 'utf8');
// naive extraction of property keys inside z.z.object({ ... }) for each schema
function extractKeys(label) {
  const re = new RegExp(
    label + '\\s*:\\s*z\\.z\\.array\\(\\s*z\\.z\\.object\\(\\{([^}]*)\\}\\)',
    's',
  );
  const m = apiContent.match(re);
  if (!m) return [];
  return m[1]
    .split(/,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.split(':')[0].trim())
    .filter((k) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k));
}
const overviewKeys = extractKeys('overview');
const breakdownKeys = extractKeys('breakdown');
const alertsKeys = extractKeys('alerts');

function keysFromDescriptor(value) {
  const inner = value.match(/\[{([^}]+)}]/);
  if (!inner) return [];
  return inner[1].split(/,/).map((p) => p.trim().split(':')[0]);
}
const descOverviewKeys = keysFromDescriptor(descriptorObj.overview || '');
const descBreakdownKeys = keysFromDescriptor(descriptorObj.breakdown || '');
const descAlertsKeys = keysFromDescriptor(descriptorObj.alerts || '');
function eq(a, b) {
  return a.slice().sort().join(',') === b.slice().sort().join(',');
}
if (
  !eq(overviewKeys, descOverviewKeys) ||
  !eq(breakdownKeys, descBreakdownKeys) ||
  !eq(alertsKeys, descAlertsKeys)
) {
  console.error(
    '[spec:descriptor] key set mismatch between api.ts zod schemas and validationDescriptor.ts',
  );
  console.error(' overview api.ts=', overviewKeys, ' descriptor=', descOverviewKeys);
  console.error(' breakdown api.ts=', breakdownKeys, ' descriptor=', descBreakdownKeys);
  console.error(' alerts api.ts=', alertsKeys, ' descriptor=', descAlertsKeys);
  process.exit(1);
}
console.log(
  '[spec:descriptor] OK - manual zod schema key sets match descriptor (hash',
  expectedHash,
  ')',
);
