#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const specPath = path.join(__dirname,'..','openapi','finops-api.json');
const genPath = path.join(__dirname,'..','src','generated','finops-api.ts');

if(!fs.existsSync(specPath)) { console.error('[contracts spec:hash] missing spec'); process.exit(1); }
if(!fs.existsSync(genPath)) { console.error('[contracts spec:hash] missing generated file (run build)'); process.exit(1); }
const spec = fs.readFileSync(specPath,'utf8');
const hash = crypto.createHash('sha256').update(spec).digest('hex');
const gen = fs.readFileSync(genPath,'utf8');
const m = gen.match(/SPEC_HASH:\s*([a-f0-9]{64})/);
if(!m) { console.error('[contracts spec:hash] SPEC_HASH comment missing'); process.exit(1); }
if(m[1] !== hash) {
  console.error('[contracts spec:hash] mismatch');
  console.error(' expected', hash); console.error(' found   ', m[1]);
  process.exit(1);
}
console.log('[contracts spec:hash] OK', hash.slice(0,12));
