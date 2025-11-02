#!/usr/bin/env node
/*
 Simple bundle inspection script.
 1. Builds a single-file ESM bundle with esbuild (metafile enabled)
 2. Prints top modules by size
 3. Emits dist-analyze/bundle-analyze.html with a basic table (no treemap due to source map issues)
*/
const fs = require('fs');
const path = require('path');

const { build } = require('esbuild');

(async function main() {
  try {
    const outDir = path.join(process.cwd(), 'dist-analyze');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const result = await build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      format: 'esm',
      outdir: outDir,
      splitting: true,
      sourcemap: false,
      metafile: true,
      minify: true,
      define: {
        COSTSCOPE_RUNTIME_VALIDATE: 'false',
        'process.env.NODE_ENV': '"production"',
      },
      loader: { '.svg': 'dataurl' },
      logLevel: 'silent',
      entryNames: '[name]'
    });

    const meta = result.metafile;
    // Identify the entry (default) chunk for src/index.ts
    const outputs = Object.entries(meta.outputs);
    const entryOutput = outputs.find(([file, info]) => info.entryPoint && info.entryPoint.endsWith('src/index.ts'));
    const totalBytes = outputs.reduce((s, [, info]) => s + info.bytes, 0);
    const fmt = n => (n > 1_000_000 ? (n / 1_000_000).toFixed(2) + ' MB' : n > 1_000 ? (n / 1000).toFixed(1) + ' KB' : n + ' B');

    if (!entryOutput) {
      console.log('Could not locate entry chunk. Outputs:');
      for (const [f, info] of outputs) console.log('  ', f, fmt(info.bytes));
      process.exit(1);
    }

  const [entryFile, entryInfo] = entryOutput;
  const entryInputs = Object.entries(entryInfo.inputs || {}).map(([file, info]) => ({ file, bytes: info.bytesInOutput }));
    entryInputs.sort((a, b) => b.bytes - a.bytes);
    const entryTop = entryInputs.slice(0, 40);

    console.log(`\nDefault ESM entry chunk: ${entryFile}`);
    console.log('Entry chunk size (raw, before gzip): ' + fmt(entryInfo.bytes));
    console.log('\nTop modules in entry chunk:');
    for (const e of entryTop) console.log('  ' + e.file + '  ' + fmt(e.bytes) + '  ' + (e.bytes / entryInfo.bytes * 100).toFixed(2) + '%');
    console.log(`\nTotal bundle (all split chunks) size: ${fmt(totalBytes)}`);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Costscope Bundle Analyze</title>
  <style>body{font-family:system-ui,Arial,sans-serif;padding:16px;max-width:1100px;margin:auto}table{border-collapse:collapse;width:100%}th,td{padding:4px 8px;border:1px solid #ccc;font-size:13px}th{background:#f5f5f5;position:sticky;top:0}tbody tr:nth-child(even){background:#fafafa}</style></head><body>
  <h1>Costscope Bundle Analysis</h1>
  <p>Code-split esbuild bundle for directional inspection.</p>
  <h2>Default entry chunk</h2>
  <p>File: <code>${entryFile}</code> – Raw size: ${fmt(entryInfo.bytes)} (minified, uncompressed)</p>
  <table><thead><tr><th>#</th><th>Module</th><th>Bytes</th><th>%</th></tr></thead><tbody>
  ${entryTop.map((e,i)=>`<tr><td>${i+1}</td><td>${e.file}</td><td>${e.bytes}</td><td>${(e.bytes/entryInfo.bytes*100).toFixed(2)}</td></tr>`).join('')}
  </tbody></table>
  <h2>All chunks</h2>
  <table><thead><tr><th>Chunk</th><th>Bytes</th></tr></thead><tbody>
  ${outputs.map(([f, info])=>`<tr><td>${f}${info.entryPoint? ' <em>(entry)</em>': ''}</td><td>${info.bytes}</td></tr>`).join('')}
  </tbody></table>
  <p>Total size across all chunks: ${fmt(totalBytes)}</p>
  </body></html>`;
  fs.writeFileSync(path.join(outDir, 'bundle-analyze.html'), html);
  console.log('\nHTML report: dist-analyze/bundle-analyze.html');
  } catch (e) {
    console.error('Analysis failed', e);
    process.exit(1);
  }
})();
