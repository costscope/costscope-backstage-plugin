#!/usr/bin/env node
/*
 * release-check.js
 * Pre-release guard:
 * 1. CHANGELOG contains current package.json version (excluding Unreleased section)
 * 2. Coverage statements >= 80% (reads coverage/coverage-final.json)
 * 3. No TODO markers inside src/ (case-insensitive)
 * 4. Root public barrel (src/index.ts) must not contain wildcard export (export * from ...)
 */

const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error(`\n[release-check] FAIL: ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`[release-check] ${msg}`);
}

// 1. Version in CHANGELOG
(function checkChangelogVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
  const versionHeader = `## [${pkg.version}]`;
  if (!changelog.includes(versionHeader)) {
    fail(`CHANGELOG.md missing section header ${versionHeader}`);
  } else {
    ok(`CHANGELOG contains ${versionHeader}`);
  }
})();

// 2. Coverage statements >= 80
(function checkCoverage() {
  const coverageFile = path.join(__dirname, '..', 'coverage', 'coverage-final.json');
  if (!fs.existsSync(coverageFile)) {
    fail('coverage/coverage-final.json not found. Run tests with coverage before version bump.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  let statementsCovered = 0;
  let statementsTotal = 0;
  for (const file of Object.values(data)) {
    if (!file || !file.s) continue;
    const sMap = file.statementMap || {};
    const hits = file.s;
    for (const id of Object.keys(hits)) {
      statementsTotal++;
      if (hits[id] > 0) statementsCovered++;
    }
  }
  const pct = statementsTotal ? (statementsCovered / statementsTotal) * 100 : 0;
  if (pct < 80) {
    fail(`Statements coverage ${pct.toFixed(2)}% < 80% threshold`);
  } else {
    ok(`Statements coverage ${pct.toFixed(2)}% >= 80%`);
  }
})();

// 3. No TODO markers in src
(function checkTodos() {
  const SRC_DIR = path.join(__dirname, '..', 'src');
  const disallowed = /\bTODO\b/i;
  let found = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
        const content = fs.readFileSync(full, 'utf8');
        if (disallowed.test(content)) {
          found.push(full.replace(SRC_DIR + path.sep, 'src/'));
        }
      }
    }
  }
  walk(SRC_DIR);
  if (found.length) {
    fail(`Found TODO markers in: ${found.join(', ')}`);
  } else {
    ok('No TODO markers in src/');
  }
})();

// 4. No wildcard export in root barrel
(function checkRootBarrel() {
  const barrel = path.join(__dirname, '..', 'src', 'index.ts');
  if (!fs.existsSync(barrel)) {
    fail('src/index.ts not found');
    return;
  }
  const content = fs.readFileSync(barrel, 'utf8');
  const wildcard = /export\s+\*\s+from\s+'|"/;
  if (wildcard.test(content)) {
    fail('Wildcard export detected in src/index.ts (disallowed).');
  } else {
    ok('No wildcard export in src/index.ts');
  }
})();

if (process.exitCode === 1) {
  console.error('\n[release-check] One or more checks failed. Aborting preversion.');
  process.exit(1);
} else {
  console.log('[release-check] All checks passed.');
}
