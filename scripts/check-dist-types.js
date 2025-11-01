#!/usr/bin/env node
/**
 * Verifies that package.json "types" points to an existing file under dist/.
 * Exits with code 1 and a concise message if the check fails.
 */
const fs = require('fs');
const path = require('path');

try {
  // Determine package.json to validate: prefer current working directory so the script can
  // be invoked from a workspace (e.g., packages/plugin). Fallback to repo root if needed.
  const cwd = process.cwd();
  const fallbackRoot = path.resolve(__dirname, '..');
  const candidatePkgPaths = [
    path.resolve(cwd, 'package.json'),
    path.resolve(fallbackRoot, 'package.json'),
  ];
  const pkgPath = candidatePkgPaths.find((p) => fs.existsSync(p));
  if (!pkgPath) {
    console.error('types: could not locate package.json');
    process.exit(1);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const typesRel = pkg.types || (pkg.exports && pkg.exports['.'] && pkg.exports['.'].types);
  if (!typesRel) {
    console.error('types: missing types entry in package.json');
    process.exit(1);
  }
  // Resolve the types path relative to the package.json location we found
  const pkgDir = path.dirname(pkgPath);
  const typesAbs = path.resolve(pkgDir, typesRel);
  if (!fs.existsSync(typesAbs)) {
    console.error(`types: file not found: ${typesRel}`);
    process.exit(1);
  }
  const stat = fs.statSync(typesAbs);
  if (!stat.isFile()) {
    console.error(`types: not a file: ${typesRel}`);
    process.exit(1);
  }
  // Ensure it's under dist/
  const relFromRoot = path.relative(pkgDir, typesAbs);
  if (!relFromRoot.startsWith(`dist${path.sep}`)) {
    console.error(`types: expected to live under dist/, got ${relFromRoot}`);
    process.exit(1);
  }
  process.exit(0);
} catch (e) {
  console.error('types: verification error', e && e.message ? e.message : e);
  process.exit(1);
}
