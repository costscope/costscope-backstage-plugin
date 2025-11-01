const path = require('path');
const fs = require('fs');
const { buildSync } = require('esbuild');

async function main() {
  const pkgRoot = process.cwd();
  const entry = path.join(pkgRoot, 'src', '__tests__', 'integration', 'runner.ts');
  const outDir = path.join(pkgRoot, 'temp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'runner.bundled.cjs');

  // Bundle runner + source client into a CJS file. Externalize large UI deps.
  try {
    buildSync({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: outFile,
      sourcemap: false,
      external: ['react', 'react-dom', 'react/jsx-runtime', 'recharts', '@backstage/plugin-catalog-react'],
      target: ['node20'],
    });
  } catch (e) {
    console.error('esbuild failed', e && (e.stack || e.message) || e);
    process.exit(2);
  }

  // Execute the bundled runner
  try {
    require(outFile);
  } catch (e) {
    console.error('bundled runner error', e && (e.stack || e.message) || e);
    process.exit(3);
  }
}

main();
