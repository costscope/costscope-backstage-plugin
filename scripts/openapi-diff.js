#!/usr/bin/env node
/* eslint-disable */
/**
 * OpenAPI diff → PR comment proposal
 *
 * Compares the OpenAPI spec in this repo between a base ref and the current HEAD/working tree
 * and prints a Markdown-formatted summary suitable for posting as a PR comment.
 *
 * Defaults:
 *  - Spec path: packages/contracts/openapi/finops-api.json (single source of truth)
 *  - Base ref: env BASE_REF || GITHUB_BASE_REF || origin/main || main
 *  - Head ref: env HEAD_REF (if provided, reads from git); otherwise reads from working tree
 *
 * Usage examples:
 *  node scripts/openapi-diff.js
 *  BASE_REF=origin/main node scripts/openapi-diff.js
 *  BASE_REF=main HEAD_REF=HEAD node scripts/openapi-diff.js
 *
 * CI example (GitHub Actions):
 *  - run: node scripts/openapi-diff.js > openapi-diff.md
 *  - run: gh pr comment ${{ github.event.pull_request.number }} --body-file openapi-diff.md
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const PREFERRED_SPEC = path.join(REPO_ROOT, 'packages', 'contracts', 'openapi', 'finops-api.json');

function detectSpecPath() {
  if (fs.existsSync(PREFERRED_SPEC)) return PREFERRED_SPEC;
  return null;
}

function gitShow(fileRelPath, ref) {
  try {
    // Use execFileSync to avoid shell interpretation of ref/file path
    return cp.execFileSync('git', ['show', `${ref}:${fileRelPath}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (e) {
    return undefined;
  }
}

function guessBaseRef() {
  const envBase = process.env.BASE_REF || process.env.GITHUB_BASE_REF;
  if (envBase && envBase.trim()) return envBase.trim();
  // Try origin/main, then main
  try {
    // Avoid shell: verify branch existence via execFileSync
    cp.execFileSync('git', ['rev-parse', '--verify', 'origin/main'], { cwd: REPO_ROOT, stdio: 'ignore' });
    return 'origin/main';
  } catch {
    return 'main';
  }
}

function readJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse JSON (${label}): ${e.message}`);
  }
}

function stableStringify(obj) {
  return JSON.stringify(sortDeep(obj));
}

function sortDeep(x) {
  if (Array.isArray(x)) return x.map(sortDeep);
  if (x && typeof x === 'object') {
    const out = {};
    for (const k of Object.keys(x).sort()) out[k] = sortDeep(x[k]);
    return out;
  }
  return x;
}

const HTTP_METHODS = ['get', 'put', 'post', 'patch', 'delete', 'options', 'head', 'trace'];

function toOpsMap(spec) {
  const map = new Map();
  const paths = (spec && spec.paths) || {};
  for (const p of Object.keys(paths)) {
    const entry = paths[p] || {};
    for (const m of HTTP_METHODS) {
      if (entry[m]) {
        map.set(`${m.toUpperCase()} ${p}`, entry[m]);
      }
    }
  }
  return map;
}

function opFingerprint(op) {
  const params = Array.isArray(op.parameters) ? op.parameters.map(p => ({
    name: p && p.name,
    in: p && p.in,
    required: !!(p && p.required),
  })) : [];
  params.sort((a, b) => (a.in + ':' + a.name).localeCompare(b.in + ':' + b.name));

  const req = op.requestBody || undefined;
  const reqContent = req && req.content ? Object.keys(req.content).sort() : [];
  const reqRequired = !!(req && req.required);

  const res = op.responses || {};
  const resCodes = Object.keys(res).sort();
  const resContent = {};
  for (const code of resCodes) {
    const content = res[code] && res[code].content;
    resContent[code] = content ? Object.keys(content).sort() : [];
  }

  const sec = op.security ? stableStringify(op.security) : undefined;

  return stableStringify({
    operationId: op.operationId || undefined,
    summary: op.summary || undefined,
    params,
    request: { content: reqContent, required: reqRequired },
    responses: { codes: resCodes, content: resContent },
    security: sec,
  });
}

function diffOps(baseMap, headMap) {
  const added = [];
  const removed = [];
  const changed = [];

  for (const k of headMap.keys()) {
    if (!baseMap.has(k)) added.push(k);
  }
  for (const k of baseMap.keys()) {
    if (!headMap.has(k)) removed.push(k);
  }
  for (const k of headMap.keys()) {
    if (baseMap.has(k)) {
      const bf = opFingerprint(baseMap.get(k));
      const hf = opFingerprint(headMap.get(k));
      if (bf !== hf) changed.push(k);
    }
  }
  added.sort();
  removed.sort();
  changed.sort();
  return { added, removed, changed };
}

function explainOpChange(baseOp, headOp) {
  const notes = [];
  // parameters
  const bParams = new Map();
  (Array.isArray(baseOp.parameters) ? baseOp.parameters : []).forEach(p => {
    if (p && p.name && p.in) bParams.set(`${p.in}:${p.name}`, p);
  });
  const hParams = new Map();
  (Array.isArray(headOp.parameters) ? headOp.parameters : []).forEach(p => {
    if (p && p.name && p.in) hParams.set(`${p.in}:${p.name}`, p);
  });
  const paramAdded = [];
  const paramRemoved = [];
  const paramReqChanged = [];
  for (const k of hParams.keys()) if (!bParams.has(k)) paramAdded.push(k);
  for (const k of bParams.keys()) if (!hParams.has(k)) paramRemoved.push(k);
  for (const k of hParams.keys()) {
    if (bParams.has(k)) {
      const br = !!bParams.get(k).required;
      const hr = !!hParams.get(k).required;
      if (br !== hr) paramReqChanged.push(`${k} (required: ${br} → ${hr})`);
    }
  }
  if (paramAdded.length) notes.push(`params added: ${paramAdded.join(', ')}`);
  if (paramRemoved.length) notes.push(`params removed: ${paramRemoved.join(', ')}`);
  if (paramReqChanged.length) notes.push(`params required changed: ${paramReqChanged.join(', ')}`);

  // request body content types
  const bReq = baseOp.requestBody && baseOp.requestBody.content ? Object.keys(baseOp.requestBody.content).sort() : [];
  const hReq = headOp.requestBody && headOp.requestBody.content ? Object.keys(headOp.requestBody.content).sort() : [];
  const reqAdded = hReq.filter(ct => !bReq.includes(ct));
  const reqRemoved = bReq.filter(ct => !hReq.includes(ct));
  const bReqReq = !!(baseOp.requestBody && baseOp.requestBody.required);
  const hReqReq = !!(headOp.requestBody && headOp.requestBody.required);
  if (reqAdded.length) notes.push(`request content added: ${reqAdded.join(', ')}`);
  if (reqRemoved.length) notes.push(`request content removed: ${reqRemoved.join(', ')}`);
  if (bReqReq !== hReqReq) notes.push(`request required: ${bReqReq} → ${hReqReq}`);

  // responses
  const bRes = baseOp.responses || {};
  const hRes = headOp.responses || {};
  const bCodes = Object.keys(bRes).sort();
  const hCodes = Object.keys(hRes).sort();
  const resAdded = hCodes.filter(c => !bCodes.includes(c));
  const resRemoved = bCodes.filter(c => !hCodes.includes(c));
  if (resAdded.length) notes.push(`responses added: ${resAdded.join(', ')}`);
  if (resRemoved.length) notes.push(`responses removed: ${resRemoved.join(', ')}`);
  for (const code of hCodes) {
    if (bRes[code] && hRes[code]) {
      const bCT = bRes[code].content ? Object.keys(bRes[code].content).sort() : [];
      const hCT = hRes[code].content ? Object.keys(hRes[code].content).sort() : [];
      const ctAdded = hCT.filter(ct => !bCT.includes(ct));
      const ctRemoved = bCT.filter(ct => !hCT.includes(ct));
      if (ctAdded.length || ctRemoved.length) {
        notes.push(`response ${code} content types changed: +${ctAdded.join(', ')} -${ctRemoved.join(', ')}`);
      }
    }
  }

  // security
  const bSec = baseOp.security ? stableStringify(baseOp.security) : undefined;
  const hSec = headOp.security ? stableStringify(headOp.security) : undefined;
  if (bSec !== hSec) notes.push('security requirements changed');

  return notes;
}

function diffSchemas(baseSpec, headSpec) {
  const b = (baseSpec.components && baseSpec.components.schemas) || {};
  const h = (headSpec.components && headSpec.components.schemas) || {};
  const bKeys = Object.keys(b);
  const hKeys = Object.keys(h);
  const added = hKeys.filter(k => !bKeys.includes(k)).sort();
  const removed = bKeys.filter(k => !hKeys.includes(k)).sort();
  const common = hKeys.filter(k => bKeys.includes(k));
  const changed = [];
  for (const k of common) {
    if (stableStringify(b[k]) !== stableStringify(h[k])) changed.push(k);
  }
  changed.sort();
  return { added, removed, changed };
}

function mdHeader(title, level = 2) {
  return `${'#'.repeat(level)} ${title}`;
}

function formatList(items, bullet = '-') {
  return items.map(i => `${bullet} ${i}`).join('\n');
}

function main() {
  const specAbs = detectSpecPath();
  if (!specAbs) {
    console.log(mdHeader('OpenAPI diff: spec file not found'));
  console.log('No spec file detected at packages/contracts/openapi/finops-api.json');
    process.exit(0);
  }

  const relPath = path.relative(REPO_ROOT, specAbs).split(path.sep).join('/');
  const baseRef = guessBaseRef();
  const headRef = (process.env.HEAD_REF || '').trim();

  const baseText = gitShow(relPath, baseRef);
  const headText = headRef ? gitShow(relPath, headRef) : fs.readFileSync(specAbs, 'utf8');

  if (!baseText && !headText) {
    console.log(mdHeader('OpenAPI diff: no data'));
    console.log('Could not load base or head spec. Ensure the file exists in at least one ref.');
    process.exit(0);
  }

  const baseSpec = baseText ? readJson(baseText, `${baseRef}:${relPath}`) : {};
  const headSpec = headText ? readJson(headText, headRef ? `${headRef}:${relPath}` : relPath) : {};

  const baseOps = toOpsMap(baseSpec);
  const headOps = toOpsMap(headSpec);
  const ops = diffOps(baseOps, headOps);
  const schemas = diffSchemas(baseSpec, headSpec);

  const totalChanges = ops.added.length + ops.removed.length + ops.changed.length + schemas.added.length + schemas.removed.length + schemas.changed.length;

  const title = totalChanges === 0
    ? `OpenAPI: no changes vs ${baseRef}`
    : `OpenAPI changes vs ${baseRef}`;

  console.log(`<!-- Generated by scripts/openapi-diff.js -->`);
  console.log(`# ${title}`);
  console.log('');
  console.log(`Spec file: \
\`${relPath}\``);
  console.log('');

  // Summary
  console.log(mdHeader('Summary', 2));
  console.log(
    `- Endpoints: +${ops.added.length} / -${ops.removed.length} / ~${ops.changed.length}`,
  );
  console.log(
    `- Schemas: +${schemas.added.length} / -${schemas.removed.length} / ~${schemas.changed.length}`,
  );
  console.log('');

  // Endpoints details
  if (ops.added.length || ops.removed.length || ops.changed.length) {
    console.log(`<details><summary><strong>Endpoint changes</strong></summary>\n`);

    if (ops.added.length) {
      console.log(mdHeader(`Added (${ops.added.length})`, 3));
      console.log(formatList(ops.added));
      console.log('');
    }
    if (ops.removed.length) {
      console.log(mdHeader(`Removed (${ops.removed.length})`, 3));
      console.log(formatList(ops.removed));
      console.log('');
    }
    if (ops.changed.length) {
      console.log(mdHeader(`Changed (${ops.changed.length})`, 3));
      // For each changed op include a brief note of what changed
      for (const key of ops.changed) {
        const noteList = explainOpChange(baseOps.get(key) || {}, headOps.get(key) || {});
        const label = noteList.length ? ` — ${noteList.join('; ')}` : '';
        console.log(`- ${key}${label}`);
      }
      console.log('');
    }
    console.log(`</details>`);
    console.log('');
  }

  // Schemas details
  if (schemas.added.length || schemas.removed.length || schemas.changed.length) {
    console.log(`<details><summary><strong>Schema changes</strong></summary>\n`);
    if (schemas.added.length) {
      console.log(mdHeader(`Added (${schemas.added.length})`, 3));
      console.log(formatList(schemas.added));
      console.log('');
    }
    if (schemas.removed.length) {
      console.log(mdHeader(`Removed (${schemas.removed.length})`, 3));
      console.log(formatList(schemas.removed));
      console.log('');
    }
    if (schemas.changed.length) {
      console.log(mdHeader(`Changed (${schemas.changed.length})`, 3));
      console.log(formatList(schemas.changed.map(n => `${n} — structure changed`)));
      console.log('');
    }
    console.log(`</details>`);
    console.log('');
  }

  // Guidance footer
  console.log('---');
  console.log('_Note: If this PR intentionally updates the API contract, ensure generated types/schemas are refreshed in @costscope/contracts and versioned appropriately._');
  console.log('');
  console.log('Hints:');
  console.log('- Update spec in packages/contracts/openapi/finops-api.json');
  console.log('- Regenerate contracts package (locally): `yarn workspace @costscope/contracts build`');
  console.log('- Keep plugin usage in sync and update CHANGELOG as needed');
}

try {
  main();
} catch (e) {
  console.error('[openapi-diff] Failed:', e && e.message ? e.message : e);
  process.exit(1);
}
