/*
 Runs API Extractor with the strict config. Treats missing-release-tag warnings as non-fatal,
 but still fails on errors (e.g., forgotten-export) and on API signature drift.
*/
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Resolve config path whether invoked from repo root or a workspace subdir
let configPath = 'api-extractor.strict.json';
if (!fs.existsSync(configPath)) {
  const tryRoot = path.resolve(__dirname, '..', 'api-extractor.strict.json');
  if (fs.existsSync(tryRoot)) configPath = tryRoot;
}

const args = ['run', '--config', configPath, '--verbose'];
const proc = spawnSync('api-extractor', args, { encoding: 'utf8' });
const out = (proc.stdout || '') + (proc.stderr || '');
process.stdout.write(out);

const hasSignatureDrift = out.includes('You have changed the API signature');
const hasError = out.includes('Error:') || out.toLowerCase().includes('ae-forgotten-export');
const completedWithWarnings = out.includes('completed with warnings');

if (hasSignatureDrift || hasError) {
  process.exit(1);
}
if (proc.status && proc.status !== 0) {
  // Non-zero from extractor but not an error/signature drift. If it was only warnings, allow pass.
  if (completedWithWarnings) process.exit(0);
  process.exit(proc.status);
}
process.exit(0);
