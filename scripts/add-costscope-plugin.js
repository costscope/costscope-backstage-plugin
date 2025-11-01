#!/usr/bin/env node
/**
 * Auto-integrate the Costscope plugin into an existing Backstage app.
 *
 * Usage (from Backstage app root AFTER `yarn add @costscope/backstage-plugin`):
 *   node ../path-to-plugin/scripts/add-costscope-plugin.js [--app packages/app/src/App.tsx]
 *
 * Strategy:
 * 1. Detect if App.tsx uses new frontend defaults (has `@backstage/frontend-defaults` or `features:`).
 *    - If yes: ensure `import { costscope } from '@costscope/backstage-plugin';` and insert `costscope` into features array.
 * 2. Else legacy template: add `import { CostscopePage } from '@costscope/backstage-plugin';` if missing and inject
 *    `<Route path="/costscope" element={<CostscopePage />} />` inside first `<FlatRoutes>` block before closing tag.
 *
 * Idempotent: running multiple times won't duplicate entries.
 */
const fs = require('fs');
const path = require('path');

const argPathIndex = process.argv.findIndex((a) => a === '--app');
const appFile = argPathIndex > -1 ? process.argv[argPathIndex + 1] : 'packages/app/src/App.tsx';
const filePath = path.resolve(process.cwd(), appFile);

if (!fs.existsSync(filePath)) {
  console.error(`[costscope:add] File not found: ${filePath}`);
  process.exit(1);
}

let src = fs.readFileSync(filePath, 'utf8');
let changed = false;

const hasCostscopePageImport =
  /import\s+{[^}]*CostscopePage[^}]*}\s+from\s+'@costscope\/backstage-plugin'/.test(src);
const hasCostscopeFeatureImport =
  /import\s+{[^}]*costscope[^}]*}\s+from\s+'@costscope\/backstage-plugin'/.test(src);

const usesFeaturesApi = /features:\s*\[/.test(src);

if (usesFeaturesApi) {
  // Feature-based integration
  if (!hasCostscopeFeatureImport) {
    // Insert after first import block
    src = src.replace(
      /(import[^;]+;\s*\n)+/,
      (m) => m + "import { costscope } from '@costscope/backstage-plugin';\n",
    );
    changed = true;
  }
  if (!/features:\s*\[[^\]]*costscope/.test(src)) {
    src = src.replace(/features:\s*\[/, (match) => match + ' costscope,');
    changed = true;
  }
  if (changed) {
    console.log('[costscope:add] Added costscope feature to features array');
  } else {
    console.log('[costscope:add] Feature already present – no changes');
  }
} else {
  // Legacy route approach
  if (!hasCostscopePageImport) {
    // Add import near other plugin imports
    const refImport = src.match(/import[^;]+from\s+'@backstage\/plugin-[^']+';?/);
    if (refImport) {
      src = src.replace(
        refImport[0],
        refImport[0] + "\nimport { CostscopePage } from '@costscope/backstage-plugin';",
      );
    } else {
      src = "import { CostscopePage } from '@costscope/backstage-plugin';\n" + src;
    }
    changed = true;
  }
  const routeLine = '<Route path="/costscope" element={<CostscopePage />} />';
  if (!src.includes(routeLine)) {
    // Inject inside first <FlatRoutes> ... </FlatRoutes>
    const flatRoutesIdx = src.indexOf('<FlatRoutes');
    if (flatRoutesIdx === -1) {
      console.error('[costscope:add] Could not find <FlatRoutes> block – aborting');
      process.exit(2);
    }
    // Find insertion point before closing tag of that FlatRoutes block
    const closingIdx = src.indexOf('</FlatRoutes>', flatRoutesIdx);
    if (closingIdx === -1) {
      console.error('[costscope:add] Malformed: missing </FlatRoutes>');
      process.exit(3);
    }
    const before = src.slice(0, closingIdx).trimEnd();
    const after = src.slice(closingIdx);
    src = before + '\n  ' + routeLine + '\n' + after;
    changed = true;
  }
  if (changed) {
    console.log('[costscope:add] Added CostscopePage route');
  } else {
    console.log('[costscope:add] Route already present – no changes');
  }
}

if (changed) {
  fs.writeFileSync(filePath, src, 'utf8');
  console.log(`[costscope:add] Updated ${filePath}`);
}
