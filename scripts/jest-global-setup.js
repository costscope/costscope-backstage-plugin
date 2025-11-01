const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async function globalSetup() {
  if (process.env.FAST_TESTS) {
    // Skip mock server startup for fast incremental test runs to reduce CPU/memory.
    return;
  }
  const root = path.resolve(__dirname, '..');
  const pidFile = path.join(root, 'temp', 'jest-mock-server.pid');
  try {
    fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  } catch (e) { /* ignore mkdir race */ }

  const env = Object.assign({}, process.env);
  // Avoid port collisions across parallel matrix jobs: prefer explicit override, else
  // request an ephemeral port (0) so the kernel assigns a free one.
  if (!env.PORT) {
    env.PORT = env.MOCK_SERVER_PORT || '0';
  }
  // ensure mock server prints listening info on default port
  const proc = spawn(process.execPath, [path.join(root, 'scripts', 'mock-server.cjs')], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdout = [];
  const stderr = [];

  proc.stdout.on('data', d => {
    stdout.push(String(d));
    const s = stdout.join('');
    process.stdout.write(d);
    if (s.includes('Costscope mock backend listening on')) {
      // ready
      fs.writeFileSync(pidFile, String(proc.pid));
      // leave process running for test duration
    }
  });

  proc.stderr.on('data', d => {
    stderr.push(String(d));
    process.stderr.write(d);
  });

  // wait up to 10s for server to start
  const started = await new Promise(resolve => {
    const timeout = setTimeout(() => resolve(false), 10000);
    const check = () => {
      const s = stdout.join('');
      if (s.includes('Costscope mock backend listening on')) {
        clearTimeout(timeout);
        resolve(true);
      } else setTimeout(check, 100);
    };
    check();
  });

  if (!started) {
    console.error('Mock server did not start in time. Stdout:\n', stdout.join(''));
    console.error('Stderr:\n', stderr.join(''));
    // ensure process cleaned up
  try { process.kill(proc.pid); } catch (e) { /* already exited */ }
    throw new Error('Mock server startup timeout');
  }
};
