// CJS launcher: programmatically register ts-node and require the TypeScript runner logic.
const path = require('path');
const { register } = require('ts-node');

// Register ts-node to handle .ts requires in this process.
register({ transpileOnly: true, preferTsExts: true });

(async () => {
  try {
    // Load the TypeScript runner module (it exports a default async function via ESM-style)
    const runnerPath = path.join(process.cwd(), 'src', '__tests__', 'integration', 'runner.ts');
    // Use dynamic import via file URL so that ts-node's register can intercept require calls
    const { default: runnerDefault, main } = require(runnerPath);
    // If the module exports a default function, call it; else call exported main()
    if (typeof main === 'function') {
      await main();
    } else if (typeof runnerDefault === 'function') {
      await runnerDefault();
    } else {
      // Fallback: nothing to run
      console.error('No runnable export found in runner.ts');
      process.exit(2);
    }
  } catch (e) {
    console.error('launcher error', e && (e.stack || e.message) || e);
    process.exit(3);
  }
})();
