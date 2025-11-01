#!/usr/bin/env node
/*
  Simple verification for the minimal demo preview served by Vite under the GitHub Pages-like base path.

  What it checks:
  1) GET index.html at /costscope-backstage-plugin/minimal/ returns 200 and contains a root div
  2) Deep link fallback: GET /costscope returns HTML (SPA index)
  3) Finds the main JS asset reference in index.html and requests it (200 with JS content type)

  Usage:
    PREVIEW_URL=http://localhost:5174 node scripts/verify-preview.mjs
  Defaults:
    PREVIEW_URL: http://localhost:5174
*/

const BASE = '/costscope-backstage-plugin/minimal/';
const PREVIEW_URL = process.env.PREVIEW_URL || 'http://localhost:5174';

function joinUrl(base, path) {
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
}

async function fetchOk(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${opts?.method || 'GET'} ${url} -> ${res.status}`);
  return res;
}

(async () => {
  let failures = 0;

  try {
    const indexUrl = joinUrl(PREVIEW_URL, BASE);
    const res = await fetchOk(indexUrl);
    const html = await res.text();

    if (!html.includes('<div id="root">')) {
      throw new Error('index.html missing <div id="root">');
    }
    console.log(`[ok] GET ${indexUrl} -> 200, found #root`);

    // Deep-link fallback: should serve index.html
    // Use an arbitrary deep-link path under the base; the SPA should fallback to index.html
    const deepUrl = joinUrl(PREVIEW_URL, BASE + 'deep-link-check');
    const deepRes = await fetchOk(deepUrl, { method: 'GET' });
    const deepType = deepRes.headers.get('content-type') || '';
    if (!deepType.includes('text/html')) {
      throw new Error(`Deep-link content-type not HTML: ${deepType}`);
    }
    console.log(`[ok] GET ${deepUrl} -> 200, content-type: ${deepType}`);

    // Extract the main JS asset from index.html; tolerate newlines inside attribute values
    const normalized = html.replace(/\s+/g, ' ');
    const m = normalized.match(/src="([^"]*assets\/[^"]+\.js)"/i);
    if (!m) {
      throw new Error('Failed to locate main JS asset in index.html');
    }
    const assetPath = m[1];
    const assetUrl = joinUrl(PREVIEW_URL, assetPath);
    const jsRes = await fetchOk(assetUrl, { method: 'HEAD' });
    const jsType = jsRes.headers.get('content-type') || '';
    if (!/javascript|text\/javascript/.test(jsType)) {
      console.warn(`[warn] Asset content-type unexpected: ${jsType}`);
    }
    console.log(`[ok] HEAD ${assetUrl} -> 200, content-type: ${jsType}`);
  } catch (err) {
    failures++;
    console.error(`[fail] ${err.message || err}`);
  }

  if (failures > 0) {
    console.error(`Verification FAILED (${failures} issue${failures > 1 ? 's' : ''})`);
    process.exit(1);
  } else {
    console.log('Verification PASSED');
  }
})().catch((err) => {
  console.error(`[fatal] ${err.message || err}`);
  process.exit(2);
});
