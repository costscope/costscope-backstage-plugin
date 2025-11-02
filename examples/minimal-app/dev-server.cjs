#!/usr/bin/env node
const path = require('path');
const express = require('express');
const { readFileSync } = require('fs');
const esbuild = require('esbuild');
const app = express();
const root = path.join(__dirname, 'src');

// Redirect root to /costscope for a friendly demo default
app.get('/', (_req, res) => {
  res.redirect(302, '/costscope');
});

app.get('/costscope', (_req, res) => {
  const html = `<!DOCTYPE html><html><head><title>Costscope Minimal</title><meta charset='utf-8' /></head>
  <body><div id="root"></div><script type="module" src="/app.js"></script></body></html>`;
  res.setHeader('Content-Type', 'text/html');
  res.end(html);
});

let incremental;
async function buildOnce() {
  if (incremental) return incremental.outputFiles[0].text;
  incremental = await esbuild.build({
    entryPoints: [path.join(root, 'index.js')],
    bundle: true,
    format: 'esm',
    sourcemap: 'inline',
    platform: 'browser',
    target: ['es2022'],
  mainFields: ['module', 'browser', 'main'],
  conditions: ['browser', 'import', 'module', 'development'],
    // Keep everything bundled; we'll alias problematic modules to their ESM variants below.
    write: false,
    logLevel: 'silent',
    loader: {
      '.js': 'jsx',
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.svg': 'dataurl',
    },
    define: {
      'process.env.NODE_ENV': '"development"',
    },
    plugins: [
      {
        name: 'mui-esm-alias',
        setup(build) {
          const path = require('path');
          const systemDir = path.dirname(require.resolve('@mui/system/package.json'));
          const utilsDir = path.dirname(require.resolve('@mui/utils/package.json'));
          const materialDir = path.dirname(require.resolve('@mui/material/package.json'));

          // Helper to resolve subpaths to their ESM counterparts
          const resolveMUI = (pkgDir, subpath) => {
            // Direct root import -> esm/index.js
            if (!subpath) return path.join(pkgDir, 'esm/index.js');
            // Subpath -> esm/<subpath>[.js]
            const withJs = subpath.endsWith('.js') ? subpath : `${subpath}.js`;
            return path.join(pkgDir, 'esm', withJs);
          };

          build.onResolve({ filter: /^@mui\/(system|utils|material)(?:\/(.*))?$/ }, args => {
            const [, which, sub] = args.path.match(/^@mui\/(system|utils|material)(?:\/(.*))?$/) || [];
            if (!which) return null;
            const base = which === 'system' ? systemDir : which === 'utils' ? utilsDir : materialDir;
            const target = resolveMUI(base, sub);
            return { path: target };
          });
        },
      },
    ],
  });
  return incremental.outputFiles[0].text;
}

app.get('/app.js', async (_req, res) => {
  try {
    const code = await buildOnce();
    res.type('application/javascript').send(code);
  } catch (e) {
    // Log full error details to the server console for easier debugging
    // without requiring curl to display the body
    console.error('[minimal-app] Build error', e && e.message ? e.message : e);
    if (e && e.stack) {
      console.error(e.stack);
    }
    if (e && e.errors) {
      console.error('[minimal-app] esbuild errors:', e.errors);
    }
    res.status(500).type('text/plain').send('Build error: ' + (e && e.message ? e.message : String(e)));
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('[minimal-app] listening on :' + port));
