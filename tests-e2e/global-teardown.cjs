/* Global teardown: terminate processes spawned in global-setup. */
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const stateFile = path.resolve(__dirname, '.servers.json');
  if (!fs.existsSync(stateFile)) {
    console.log('[e2e][teardown] no state file; nothing to do');
    return;
  }
  const { mockPid, appPid } = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  for (const [label, pid] of Object.entries({ mock: mockPid, app: appPid })) {
    if (pid && Number.isInteger(pid)) {
      try {
        process.kill(pid, 'SIGTERM');
        console.log(`[e2e][teardown] sent SIGTERM to ${label} pid ${pid}`);
      } catch (e) {
        console.warn(`[e2e][teardown] failed to kill ${label} pid ${pid}:`, e.message);
      }
    }
  }
  // Clean up the state file to avoid leaving a tracked artifact around
  try {
    fs.rmSync(stateFile, { force: true });
    console.log('[e2e][teardown] removed state file');
  } catch (e) {
    console.warn('[e2e][teardown] failed to remove state file:', e.message);
  }
};
