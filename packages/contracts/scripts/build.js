#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const spec = path.join(__dirname,'..','openapi','finops-api.json');
const genTypes = path.join(__dirname,'..','src','generated','finops-api.ts');
const genZod = path.join(__dirname,'..','src','generated','finops-zod.ts');

fs.mkdirSync(path.dirname(genTypes), { recursive: true });

function sha256(c){return crypto.createHash('sha256').update(c).digest('hex');}
const specContent = fs.readFileSync(spec,'utf8');
const specHash = sha256(specContent);

execSync(`npx openapi-typescript ${spec} -o ${genTypes}`, { stdio:'inherit' });
execSync(`npx openapi-zod-client ${spec} -o ${genZod} --no-client --with-docs=false`, { stdio:'inherit' });

let typesContent = fs.readFileSync(genTypes,'utf8');
if(!/OPENAPI_SPEC_HASH/.test(typesContent)) {
  typesContent = typesContent + `\nexport const OPENAPI_SPEC_HASH = '${specHash}'; // SPEC_HASH: ${specHash}\n`;
} else {
  typesContent = typesContent.replace(/OPENAPI_SPEC_HASH\s*=\s*'([a-f0-9]{64})'/, `OPENAPI_SPEC_HASH='${specHash}'`);
}
fs.writeFileSync(genTypes, typesContent,'utf8');

// root barrel
const indexPath = path.join(__dirname,'..','src','index.ts');
fs.writeFileSync(indexPath, `export * from './generated/finops-api';\nexport { OPENAPI_SPEC_HASH } from './generated/finops-api';\nexport * as zodSchemas from './generated/finops-zod';\n`, 'utf8');

// build with tsup-like simple emit via tsc
execSync('npx tsc -p tsconfig.json', { stdio:'inherit' });

// convert ESM to dual outputs (simple copy)
const distDir = path.join(__dirname,'..','dist');
fs.mkdirSync(distDir,{recursive:true});
const srcIndexDts = path.join(__dirname,'..','src','index.d.ts');
if (fs.existsSync(srcIndexDts)) fs.copyFileSync(srcIndexDts, path.join(distDir,'index.d.ts'));
// naive bundling: just concatenate generated files for CJS/ESM (small surface)
const bundle = [genTypes, genZod, indexPath].map(p=>fs.readFileSync(p,'utf8')).join('\n');
fs.writeFileSync(path.join(distDir,'index.mjs'), bundle, 'utf8');
fs.writeFileSync(path.join(distDir,'index.cjs'), bundle, 'utf8');
console.log('[contracts] build complete hash', specHash.slice(0,12));
