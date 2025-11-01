#!/usr/bin/env node
/**
 * Experiment: Generate a full REST client SDK from OpenAPI and compare bundle size
 * to the current hand-written lightweight client + contracts package.
 *
 * Output: Markdown report to stdout (copy into PR) and JSON metrics file under tmp.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
// Use contracts workspace as the single source of truth for the OpenAPI spec
const specPath = path.join(root, 'packages', 'contracts', 'openapi', 'finops-api.json');
const tmpDir = path.join(root, '.experiment', 'sdk-gen');
const outClientDir = path.join(tmpDir, 'generated');
fs.mkdirSync(outClientDir, { recursive: true });

function r(p){ return path.relative(root, p); }

function sizeOfFile(p){
  const buf = fs.readFileSync(p);
  const gz = zlib.gzipSync(buf, { level: 9 });
  return { raw: buf.length, gzip: gz.length };
}

function formatKB(bytes){ return (bytes/1024).toFixed(2)+' KB'; }

// 1. Generate SDK with openapi-typescript-codegen
console.log('[exp] generating SDK...');
execSync(`npx openapi-typescript-codegen --input ${specPath} --output ${outClientDir} --client fetch`, { stdio:'inherit' });

// 2. Transpile generated TS to JS for size measurement
const buildDir = path.join(tmpDir, 'build');
fs.rmSync(buildDir, { recursive:true, force:true });
fs.mkdirSync(buildDir, { recursive:true });

const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
fs.writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: { target:'ES2022', module:'ES2022', moduleResolution:'NodeNext', declaration:false, emitDeclarationOnly:false, outDir:'build' }, include:[path.relative(tmpDir,outClientDir)+'/**/*.ts'] }, null, 2));

console.log('[exp] transpiling generated SDK (tsc)...');
try {
  execSync(`npx tsc -p ${tsconfigPath}`, { cwd: tmpDir, stdio:'pipe' });
} catch(e) {
  console.warn('[exp] tsc emitted diagnostics (non-fatal for size experiment)');
}

function collectJsFiles(dir){
  if(!fs.existsSync(dir)) return [];
  const out=[]; for(const f of fs.readdirSync(dir)) { const full=path.join(dir,f); const st=fs.statSync(full); if(st.isDirectory()) out.push(...collectJsFiles(full)); else if(/\.m?js$/.test(f)) out.push(full);} return out;
}

let jsFiles = collectJsFiles(buildDir);
const sdkSize = jsFiles.reduce((acc,f)=>{ const s=sizeOfFile(f); acc.raw+=s.raw; acc.gzip+=s.gzip; return acc; }, { raw:0,gzip:0 });

// Current plugin dist sizes
const coreEntry = path.join(root,'dist','index.mjs');
let coreSize = {raw:0,gzip:0};
if(fs.existsSync(coreEntry)) coreSize = sizeOfFile(coreEntry); else console.warn('[exp] core entry not built yet – run yarn build for full comparison');

let validationSize = { raw:0, gzip:0 };
const distDir = path.join(root,'dist');
if(fs.existsSync(distDir)) {
  for (const f of fs.readdirSync(distDir)) {
    if (/^(zod|validation)-.*\.mjs$/.test(f)) {
      const s = sizeOfFile(path.join(distDir, f));
      validationSize.raw += s.raw;
      validationSize.gzip += s.gzip;
    }
  }
}

const ratioVsCore = coreSize.gzip ? (sdkSize.gzip / coreSize.gzip) : null;
const ratioVsCorePlusValidation = (coreSize.gzip+validationSize.gzip) ? (sdkSize.gzip/(coreSize.gzip+validationSize.gzip)) : null;

const metrics = { generatedAt: new Date().toISOString(), specPath: r(specPath), sdk: sdkSize, core: coreSize, validation: validationSize, ratio: { vsCore: ratioVsCore, vsCorePlusValidation: ratioVsCorePlusValidation } };
fs.mkdirSync(path.join(tmpDir,'results'), { recursive:true });
fs.writeFileSync(path.join(tmpDir,'results','metrics.json'), JSON.stringify(metrics,null,2));

function pct(x){ return (x*100).toFixed(1)+'%'; }
function line(){ console.log(''); }
console.log('\n----- SDK Size Experiment Report (Markdown) -----\n');
console.log('### OpenAPI SDK Size Experiment');
console.log(`Spec: \`${metrics.specPath}\``); line();
console.log('| Artifact | Raw | Gzip |');
console.log('|---------|-----|------|');
console.log(`| Generated SDK (aggregate) | ${formatKB(metrics.sdk.raw)} | ${formatKB(metrics.sdk.gzip)} |`);
console.log(`| Current Core Client | ${formatKB(metrics.core.raw)} | ${formatKB(metrics.core.gzip)} |`);
console.log(`| Optional Validation Chunk(s) | ${formatKB(metrics.validation.raw)} | ${formatKB(metrics.validation.gzip)} |`);
line();
console.log('Ratios:');
if(ratioVsCore) console.log(`- SDK vs Core gzip: ${pct(ratioVsCore)}`);
if(ratioVsCorePlusValidation) console.log(`- SDK vs Core+Validation gzip: ${pct(ratioVsCorePlusValidation)}`);
line();
console.log('Notes:\n- Generated SDK includes per-operation code & models.\n- Core client is handwritten and uses shared contracts; validation loads conditionally.\n- Codegen may be further optimized (tree-shaken imports, barrel trimming).');
line();
console.log('Decision Guidelines:\n- If SDK gzip > 2x core with low DX gain: keep handwritten client.\n- If within ~1.3x and manual maintenance cost rising: consider adopting with post-gen pruning.\n- Hybrid: keep contracts (types + zod) & layer thin typed operation helpers only.');
line();
console.log('Raw metrics JSON: .experiment/sdk-gen/results/metrics.json');
