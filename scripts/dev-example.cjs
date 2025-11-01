#!/usr/bin/env node
/*
 * Dev helper: builds (via example:dev script) then:
 *  - Starts mock server unless MOCK_PORT is already bound
 *  - Starts Backstage example app unless APP_PORT is already bound
 * If BOTH ports are already in use, it assumes an environment is running and exits cleanly.
 * Environment overrides:
 *    MOCK_PORT (default 7007)
 *    APP_PORT  (default 3000)
 * Ctrl+C propagates SIGINT to any started child processes.
 */
const { spawn } = require('child_process');
const net = require('net');

const MOCK_PORT = parseInt(process.env.MOCK_PORT || '7007', 10);
const APP_PORT = parseInt(process.env.APP_PORT || '3000', 10);

function checkPort(port) {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false)); // in use
    srv.once('listening', () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, '0.0.0.0');
  });
}

(async () => {
  const mockFree = await checkPort(MOCK_PORT);
  const appFree = await checkPort(APP_PORT);
  const children = [];

  if (!mockFree && !appFree) {
    console.log(`[dev-example] Both MOCK_PORT=${MOCK_PORT} and APP_PORT=${APP_PORT} are already in use. Assuming environment is running. Exiting.`);
    return;
  }

  if (mockFree) {
    console.log(`[dev-example] Starting mock server on ${MOCK_PORT}`);
    const mock = spawn('yarn', ['mock'], { stdio: 'inherit', env: { ...process.env, FRONTEND_ORIGIN: `http://localhost:${APP_PORT}`, PORT: String(MOCK_PORT) } });
    children.push(mock);
    mock.on('exit', code => {
      if (code !== 0) console.error(`[dev-example] mock exited with code ${code}`);
    });
  } else {
    console.log(`[dev-example] Port ${MOCK_PORT} busy, assuming existing mock server.`);
  }

  if (appFree) {
    console.log(`[dev-example] Starting example Backstage app on ${APP_PORT}`);
    const app = spawn('yarn', ['example:start'], { stdio: 'inherit', env: { ...process.env, PORT: String(APP_PORT) } });
    children.push(app);
    app.on('exit', code => {
      if (code !== 0) console.error(`[dev-example] app exited with code ${code}`);
    });
  } else {
    console.log(`[dev-example] Port ${APP_PORT} busy, skipping app start.`);
  }

  if (children.length === 0) return; // nothing started

  const shutdown = () => {
    console.log('\n[dev-example] Shutting down...');
    children.forEach(p => {
      if (!p.killed) p.kill('SIGINT');
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
