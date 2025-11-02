#!/usr/bin/env node
/*
 * costscope-backstage-plugin diagnose script
 * Prints versions & integrity hashes helpful for issue reports:
 *  - Node version
 *  - Yarn version
 *  - Package version (plugin & contracts)
 *  - OpenAPI spec SHA256 (from @costscope/contracts OPENAPI_SPEC_HASH)
 *  - Validation descriptor hash (VALIDATION_DESCRIPTOR_HASH or recomputed)
 *  - First 12 chars convenience short hashes
 *  - Mismatch signal: descriptor hash vs spec hash fragment (heuristic)
 *
 * Runs safely even if build artifacts are missing (falls back to source parsing).
 */
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Note: Avoid shell-based exec helpers; prefer execFileSync with explicit args when needed.

function short(h) { return h ? h.slice(0, 12) : ''; }

// Attempt to load OPENAPI_SPEC_HASH from @costscope/contracts (preferred public source of truth)
let specHash = '';
let contractsVersion = 'unknown';
let specFileHash = '';
let specFilePath = '';
try {
  const contracts = require('@costscope/contracts');
  if (contracts && typeof contracts.OPENAPI_SPEC_HASH === 'string') specHash = contracts.OPENAPI_SPEC_HASH;
  const contractsPkgPath = require.resolve('@costscope/contracts/package.json');
  contractsVersion = JSON.parse(fs.readFileSync(contractsPkgPath, 'utf8')).version;
} catch (e) {
  // Fallback: attempt to read workspace package.json for version & generated source for spec hash
  const contractsPkg = path.join(__dirname, '..', 'packages', 'contracts', 'package.json');
  if (fs.existsSync(contractsPkg)) {
    try { contractsVersion = JSON.parse(fs.readFileSync(contractsPkg, 'utf8')).version || contractsVersion; } catch { /* ignore */ }
  }
  const generatedTs = path.join(__dirname, '..', 'packages', 'contracts', 'src', 'generated', 'finops-api.ts');
  if (fs.existsSync(generatedTs)) {
    const txt = fs.readFileSync(generatedTs, 'utf8');
    const m = txt.match(/OPENAPI_SPEC_HASH\s*=\s*'([a-f0-9]{64})'/);
    if (m) specHash = m[1];
  }
}

// Also compute raw spec file hash (source of truth) from contracts workspace only.
const candidateSpecs = [
  path.join(__dirname, '..', 'packages', 'contracts', 'openapi', 'finops-api.json'),
];
for (const p of candidateSpecs) {
  if (fs.existsSync(p)) {
    try {
      const content = fs.readFileSync(p, 'utf8');
      specFileHash = crypto.createHash('sha256').update(content).digest('hex');
      specFilePath = p;
      break;
    } catch { /* ignore */ }
  }
}

// Validation descriptor hash: prefer importing runtime file if transpiled, else parse TS source.
let validationDescriptorHash = '';
try {
  // Try requiring compiled file (after build) – may fail in pure TS state.
  const vd = require('../dist/validationDescriptor');
  if (vd && typeof vd.VALIDATION_DESCRIPTOR_HASH === 'string') validationDescriptorHash = vd.VALIDATION_DESCRIPTOR_HASH;
} catch {
  // Parse source
  try {
    const srcPath = path.join(__dirname, '..', 'src', 'validationDescriptor.ts');
    if (fs.existsSync(srcPath)) {
      const source = fs.readFileSync(srcPath, 'utf8');
      // Extract object literal
      const objMatch = source.match(/validationDescriptor\s*=\s*(\{[\s\S]*?\})\s*as const/);
      if (objMatch) {
        const literal = objMatch[1];
        // Unsafe eval in isolated context to obtain object (trusted repo source)
        const desc = Function(`"use strict"; return (${literal});`)();
        const json = JSON.stringify(desc);
        // djb2 identical to computeValidationDescriptorHash
        let h = 5381;
        for (let i = 0; i < json.length; i += 1) h = (h * 33) ^ json.charCodeAt(i);
        validationDescriptorHash = ((h >>> 0).toString(16)).padStart(8, '0');
      }
    }
  } catch { /* ignore */ }
}

// Heuristic descriptor alignment check (fragment match)
const fragment = specHash.slice(0, 8); // shorter for quick glance; CI uses 12 via verifyDescriptorHash
const specHashMatchesFile = specHash && specFileHash ? specHash === specFileHash : false;
const descriptorMatchesFragment = validationDescriptorHash && fragment ? (validationDescriptorHash === fragment) : false;

// Compose report
const pkgPath = path.join(__dirname, '..', 'package.json');
let pluginVersion = 'unknown';
try { pluginVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version; } catch { /* ignore */ }

let yarnVersion = 'unavailable';
try {
  yarnVersion = cp.execFileSync('yarn', ['--version'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  // keep 'unavailable'
}

const report = {
  environment: {
    node: process.version,
    yarn: yarnVersion,
    platform: process.platform,
  },
  packages: {
    pluginVersion,
    contractsVersion,
  },
  hashes: {
    openapiSpecHash: specHash || null, // exported constant (generated code)
    openapiSpecHashShort: short(specHash),
    openapiSpecFileHash: specFileHash || null, // direct file hash
    openapiSpecFilePath: specFilePath || null,
    openapiSpecConstantMatchesFile: specHashMatchesFile,
    validationDescriptorHash: validationDescriptorHash || null,
    validationDescriptorMatchesSpecFragment: descriptorMatchesFragment,
    specFragmentForComparison: fragment,
  },
  devValidationMetrics: null,
};

// Try to include dev-only validation failure rate metrics if a metrics file exists.
try {
  const env = process.env || {};
  const defaultPath = path.join(process.cwd(), 'temp', 'validation-metrics.json');
  const metricsPath = env.COSTSCOPE_DEV_METRICS_FILE || defaultPath;
  if (fs.existsSync(metricsPath)) {
    const raw = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    // expect shape: { generatedAt, metrics: { total, failures, failureRate, by, lastUpdatedTs } }
    report.devValidationMetrics = raw.metrics || raw;
  }
} catch { /* ignore */ }

// Pretty print
console.log('Costscope Diagnose Report');
console.log('==========================');
console.log('Environment:');
console.log(`  Node:   ${report.environment.node}`);
console.log(`  Yarn:   ${report.environment.yarn}`);
console.log(`  OS:     ${report.environment.platform}`);
console.log('Packages:');
console.log(`  Plugin:    v${report.packages.pluginVersion}`);
console.log(`  Contracts: v${report.packages.contractsVersion}`);
console.log('Hashes:');
console.log(`  OpenAPI Spec Const Hash:  ${report.hashes.openapiSpecHash || 'unavailable'}`);
console.log(`  OpenAPI Spec File Hash:   ${report.hashes.openapiSpecFileHash || 'unavailable'}`);
console.log(`  Hashes match?             ${report.hashes.openapiSpecConstantMatchesFile}`);
console.log(`  OpenAPI Spec Hash (short): ${report.hashes.openapiSpecHashShort || 'n/a'}`);
console.log(`  Validation Descriptor:    ${report.hashes.validationDescriptorHash || 'unavailable'}`);
console.log(`  Spec Fragment (8):        ${report.hashes.specFragmentForComparison || 'n/a'}`);
console.log(`  Descriptor matches fragment? ${report.hashes.validationDescriptorMatchesSpecFragment}`);
if (report.devValidationMetrics) {
  console.log('Validation Metrics (dev):');
  const m = report.devValidationMetrics;
  const pct = (m.failureRate * 100).toFixed(2);
  console.log(`  Total validations: ${m.total}`);
  console.log(`  Failures:          ${m.failures}`);
  console.log(`  Failure rate:      ${pct}%`);
  if (m.by) {
    console.log('  By schema:');
    // m.by is expected to have keys like overview/breakdown/alerts/unknown
    for (const [schema, stats] of Object.entries(m.by)) {
      const rate = ((stats.failureRate || (stats.total ? (stats.failures / stats.total) : 0)) * 100).toFixed(2);
      console.log(`    - ${schema}: total=${stats.total}, failures=${stats.failures}, rate=${rate}%`);
    }
  }
  if (m.lastUpdatedTs) {
    try {
      const d = new Date(m.lastUpdatedTs);
      // ISO string for portability
      console.log(`  Last updated:      ${d.toISOString()}`);
    } catch { /* ignore */ }
  }
}
console.log('\nJSON:');
console.log(JSON.stringify(report, null, 2));

// Exit code: non-zero if we failed to obtain critical hashes
if (!specHash || !validationDescriptorHash) {
  process.exitCode = 1; // soft failure – still produced report
}
