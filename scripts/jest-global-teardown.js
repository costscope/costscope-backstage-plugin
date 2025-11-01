const fs = require('fs');
const path = require('path');

module.exports = async function globalTeardown() {
  const root = path.resolve(__dirname, '..');
  const pidFile = path.join(root, 'temp', 'jest-mock-server.pid');
  try {
    if (fs.existsSync(pidFile)) {
      const pid = Number(fs.readFileSync(pidFile, 'utf8'));
      try {
        // Politely ask the mock server to exit and wait briefly to avoid Jest open handle warnings.
        process.kill(pid, 'SIGTERM');
        const deadline = Date.now() + 2000; // up to 2s
        while (Date.now() < deadline) {
          try {
            // If process is still alive, kill(pid, 0) will not throw
            process.kill(pid, 0);
            await new Promise(r => setTimeout(r, 50));
          } catch {
            break; // process no longer exists
          }
        }
        // If still alive after grace period, force kill.
        try { process.kill(pid, 'SIGKILL'); } catch (e) { /* already exited */ }
      } catch (e) { /* ignore */ }
      fs.unlinkSync(pidFile);
    }
  } catch (e) {
    // ignore
  }
};
