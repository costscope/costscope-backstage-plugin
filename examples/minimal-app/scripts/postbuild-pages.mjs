#!/usr/bin/env node
// Create 404.html alongside index.html for GitHub Pages SPA fallback
// so deep links under the base path load the app instead of a hard 404.

import { promises as fs } from 'fs';
import { resolve } from 'path';

async function main() {
  const dist = resolve(process.cwd(), 'dist');
  const indexPath = resolve(dist, 'index.html');
  const notFoundPath = resolve(dist, '404.html');
  try {
    const html = await fs.readFile(indexPath, 'utf8');
    await fs.writeFile(notFoundPath, html, 'utf8');
    console.log('[postbuild] Wrote dist/404.html for GitHub Pages SPA fallback');
  } catch (e) {
    console.warn('[postbuild] Skipped 404.html creation:', e?.message || e);
  }
}

main();
