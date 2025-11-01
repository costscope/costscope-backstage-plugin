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
  // Workaround: esbuild occasionally grabs the Node (CJS) /utils entry which then triggers
  // a dynamic require path not supported in ESM-only browser bundle. Mark utils (and any
  // node/* subpath) external so the runtime resolves the proper browser/ESM variant from
  // the installed package rather than our transformed version. This avoids the
  // "Dynamic require of '@mui/material/utils'" and interop helper errors observed in the
  // minimal app environment.
    external: [
      '@mui/material/utils',
      '@mui/material/node/*',
    ],
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
          const map = new Map([
            ['@mui/system', require.resolve('@mui/system/esm/index.js')],
            ['@mui/utils', require.resolve('@mui/utils/esm/index.js')],
            ['@mui/system/createStyled', require.resolve('@mui/system/esm/createStyled.js')],
          ]);
          build.onResolve({ filter: /^@mui\/(system|utils)(\/createStyled)?$/ }, args => {
            const target = map.get(args.path);
            if (target) return { path: target };
            return null;
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
    res.status(500).type('text/plain').send('Build error: ' + e.message);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('[minimal-app] listening on :' + port));
