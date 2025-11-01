/** @jest-environment node */
/* Forked runner approach: spawn a separate Node process that registers ts-node
   and loads TypeScript files so that Jest's transformer doesn't parse them. */
const { spawn } = require('child_process');
const path = require('path');

describe('client http integration (forked runner)', () => {
  it('runs the TypeScript runner via ts-node and exits 0', async () => {
    const runner = path.resolve(__dirname, './client-http.runner.ts');

  // Run the ts-node CLI directly to execute the TypeScript runner. This
  // avoids Node attempting to treat .ts files as ESM in some environments.
  const cjsRunner = path.resolve(__dirname, './client-http.runner.cjs');
  const child = spawn(process.execPath, [cjsRunner], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    const exitCode = await new Promise((resolve) => child.on('close', resolve));

    if (exitCode !== 0) {
      // include runner output to help debugging
      console.error('Runner stdout:\n', stdout);
      console.error('Runner stderr:\n', stderr);
    }

    expect(exitCode).toBe(0);
  }, 20000);
});
