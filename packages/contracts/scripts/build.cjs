#!/usr/bin/env node
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Resolve a package CLI bin to an absolute JS file and execute via Node, avoiding shell
function resolveBin(pkgName, binName) {
  const pkgJsonPath = require.resolve(`${pkgName}/package.json`);
  const pkgDir = path.dirname(pkgJsonPath);
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const binField = pkgJson.bin;
  const rel = typeof binField === 'string' ? binField : (binField && binField[binName || pkgName]);
  if (!rel) {
    throw new Error(`Unable to resolve bin for ${pkgName}`);
  }
  return path.resolve(pkgDir, rel);
}

const spec = path.join(__dirname,'..','openapi','finops-api.json');
const genTypes = path.join(__dirname,'..','src','generated','finops-api.ts');
const genZod = path.join(__dirname,'..','src','generated','finops-zod.ts');

fs.mkdirSync(path.dirname(genTypes), { recursive: true });

function sha256(c){return crypto.createHash('sha256').update(c).digest('hex');}
const specContent = fs.readFileSync(spec,'utf8');
const specHash = sha256(specContent);

// Execute CLIs directly via Node to avoid shell interpretation and dependence on PATH/npx
const node = process.execPath;
const openapiTsCli = resolveBin('openapi-typescript', 'openapi-typescript');
const openapiZodCli = resolveBin('openapi-zod-client', 'openapi-zod-client');
execFileSync(node, [openapiTsCli, spec, '-o', genTypes], { stdio: 'inherit' });
execFileSync(node, [openapiZodCli, spec, '-o', genZod], { stdio: 'inherit' });

let typesContent = fs.readFileSync(genTypes,'utf8');
// Normalize JSDoc to avoid unsupported TSDoc tags emitted by generators
// Replace non-standard @description/@enum with plain words to prevent API Extractor warnings
typesContent = typesContent
  .replace(/@description\b/g, 'description')
  .replace(/@enum\b/g, 'enum');
// Inject release tags on top-level interfaces so API Extractor sees them as public
typesContent = typesContent
  .replace(/^(export interface\s+paths\b)/m, '/** @public */\n$1')
  .replace(/^(export interface\s+components\b)/m, '/** @public */\n$1');
if(!/OPENAPI_SPEC_HASH/.test(typesContent)) {
  typesContent = typesContent + `\nexport const OPENAPI_SPEC_HASH = '${specHash}'; // SPEC_HASH: ${specHash}\n`;
} else {
  typesContent = typesContent.replace(/OPENAPI_SPEC_HASH\s*=\s*'([a-f0-9]{64})'/, `OPENAPI_SPEC_HASH='${specHash}'`);
}
fs.writeFileSync(genTypes, typesContent,'utf8');

// root barrel (NodeNext requires explicit .js extensions in source ESM imports)
const indexPath = path.join(__dirname,'..','src','index.ts');
const indexBarrel = [
  '// Curated re-exports with explicit release tags (written by build script)\n',
  '/** @public */\nexport type paths = import(\'./generated/finops-api.js\').paths;\n',
  '/** @public */\nexport type components = import(\'./generated/finops-api.js\').components;\n',
  '/** @public */\nexport type operations = import(\'./generated/finops-api.js\').operations;\n',
  '/** @public */\nexport type $defs = import(\'./generated/finops-api.js\').$defs;\n',
  "export { OPENAPI_SPEC_HASH } from './generated/finops-api.js';\n",
  "// Explicit zod exports (avoid wildcard barrel)\n",
  "export { schemas as zodSchemas } from './generated/finops-zod.js';\n",
  "export { api as zodApi, createApiClient as createZodApiClient } from './generated/finops-zod.js';\n",
].join('');
fs.writeFileSync(indexPath, indexBarrel, 'utf8');

console.log('[contracts] build complete hash', specHash.slice(0,12));
