/* Global setup for Playwright E2E tests.
 * Responsibilities:
 *  - Start mock Costscope server on port 7100
 *  - Start example Backstage app (examples/backstage-app) via workspace script
 *  - Wait for mock healthz and /costscope route readiness
 *  - Persist spawned process PIDs for teardown
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function now() { return Date.now(); }
function fmt(ms) { return `${ms}ms`; }
const timing = [];
function stage(name) {
  const start = now();
  return {
    end(extra) {
      const dur = now() - start;
      timing.push({ name, ms: dur, ...extra });
      console.log(`[e2e][setup][timing] stage=${name} duration=${dur}ms` + (extra?.info ? ` info=${extra.info}` : ''));
    },
  };
}

async function waitFor(url, { timeoutMs = 120000, intervalMs = 2000, expectText } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.ok) {
        if (expectText) {
          const txt = await res.text();
            if (txt.includes(expectText)) return; // success
        } else {
          return;
        }
      }
    } catch (e) {
      // swallow and retry
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function isReachable(url) {
  try {
    const res = await fetch(url, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

async function isDevProxyHealthy(baseUrl = 'http://localhost:3000') {
  try {
    const url = `${baseUrl}/api/costscope/healthz`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    if (!/application\/json/i.test(ct)) {
      // Attempt parse anyway; SPA fallback would throw
      try { await res.json(); } catch { return false; }
    } else {
      try { await res.json(); } catch { return false; }
    }
    return true;
  } catch {
    return false;
  }
}

async function waitForDevProxy(baseUrl = 'http://localhost:3000', { timeoutMs = 60000, intervalMs = 1500 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isDevProxyHealthy(baseUrl)) return;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout waiting for dev proxy JSON at ${baseUrl}/api/costscope/healthz`);
}

async function killPort(port) {
  try {
    const { execFileSync } = require('child_process');
    let out = '';
    try {
      // Get PIDs listening on the port; returns one PID per line
      out = execFileSync('lsof', ['-ti', `:${String(port)}`], { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    } catch {
      return; // lsof not available or no PIDs
    }
    const pids = out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const pid of pids) {
      try { process.kill(Number(pid), 'SIGKILL'); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

// No longer needed: we now point discovery directly at the mock server (7007)

module.exports = async () => {
  // __dirname = tests-e2e; repo root is its parent
  const repoRoot = path.resolve(__dirname, '..');
  const stateFile = path.join(__dirname, '.servers.json');
  const processes = {};
  const envBase = { ...process.env };
  // Reuse flag (new preferred: E2E_REUSE=1). Old E2E_REUSE_SANDBOX kept for backwards compatibility.
  const reuse = process.env.E2E_REUSE === '1' || process.env.E2E_REUSE_SANDBOX === '1';
  // Prefer Backstage example app for stability; allow forcing minimal via E2E_USE_MINIMAL=1 (still experimental).
  const minimalRoot = path.join(repoRoot, 'examples', 'minimal-app');
  const minimalPkg = path.join(minimalRoot, 'package.json');
  const minimalExists = fs.existsSync(minimalPkg);
  const useMinimal = process.env.E2E_USE_MINIMAL === '1' && minimalExists;
  const exampleRoot = useMinimal
    ? path.join(repoRoot, 'examples', 'minimal-app')
    : path.join(repoRoot, 'examples', 'backstage-app');
  const appDir = useMinimal
    ? minimalRoot
    : path.join(exampleRoot, 'packages', 'app');

  function spawnWorkspaceApp(args, opts = {}) {
    if (useMinimal) {
      // Start minimal app via Vite dev server for reliable ESM bundling (avoids CJS/ESM interop issues)
      // Keep browser closed and ensure port is 3000 to match CORS defaults in mock server
      return spawn('yarn', ['workspace', '@examples/minimal-app', 'start'], {
        cwd: repoRoot,
        env: opts.env || { ...envBase, BROWSER: 'none', PORT: '3000' },
        stdio: opts.stdio || ['ignore', 'pipe', 'pipe'],
      });
    }
    return spawn('yarn', ['workspace', 'app', ...args], {
      cwd: repoRoot,
      env: opts.env || { ...envBase },
      stdio: opts.stdio || ['ignore', 'pipe', 'pipe'],
    });
  }

  async function ensureInstallIfNeeded(label) {
    const nm = path.join(repoRoot, 'node_modules');
    if (!fs.existsSync(nm)) {
      console.log(`[e2e][setup] ${label}: installing root workspace dependencies`);
      const p = spawn('yarn', ['install', '--immutable'], { cwd: repoRoot, stdio: 'inherit', env: envBase });
      await new Promise((resolve, reject) => p.on('exit', c => c === 0 ? resolve() : reject(new Error(`install exit ${c}`))));
    }
  }

  let attemptedAutoMinimal = false;

  async function startExampleApp(mode) {
    await ensureInstallIfNeeded(mode);
    // Ensure plugin is built (fast build)
    if (!fs.existsSync(path.join(repoRoot, 'dist'))) {
      console.log('[e2e][setup] building plugin (missing dist)');
      await new Promise((resolve, reject) => {
        const b = spawn('yarn', ['build:size'], { cwd: repoRoot, stdio: 'inherit', env: envBase });
        b.on('exit', c => c === 0 ? resolve() : reject(new Error('build exit ' + c)));
      });
    }
    // Force the webpack devServer proxy to target the mock server directly during E2E
    // This avoids relying on the separate mock-backend (7008) process.
    let app = spawnWorkspaceApp(['start'], { env: { ...envBase, BROWSER: 'none', BACKEND_BASE_URL: `http://localhost:${process.env.MOCK_PORT || '7007'}` } });
    let firstErrorChunk = '';
    let moduleNotFoundCount = 0;
    const missingModules = new Set();
    app.stderr.on('data', d => {
      const text = d.toString();
      if (!firstErrorChunk) firstErrorChunk = text.slice(0, 200);
      // Detect missing module cascades early; if many distinct modules are missing, trigger an automatic minimal rebuild.
      if (/Module not found/i.test(text)) {
        // Try to extract module name after "Can't resolve" or similar patterns
        const match = text.match(/Can't resolve\s+'([^']+)'|Can't resolve\s+"([^"]+)"|Module not found: Error: Cannot find module '([^']+)'/);
        const mod = match?.[1] || match?.[2] || match?.[3];
        if (mod) missingModules.add(mod);
        moduleNotFoundCount = missingModules.size;
        if (
          !attemptedAutoMinimal &&
          process.env.E2E_DISABLE_AUTO_MINIMAL !== '1' &&
          moduleNotFoundCount >= 8 // heuristic threshold for "heavy" cascade
        ) {
          attemptedAutoMinimal = true;
          console.warn('[e2e][setup] detected heavy missing-module cascade (' + moduleNotFoundCount + '); auto-triggering minimal example app restart');
          try { app.kill('SIGTERM'); } catch { /* ignore */ }
          (async () => {
            try {
              await ensureInstallIfNeeded('auto-reinstall');
              console.log('[e2e][setup] reinstall complete; restarting example app');
              app = spawnWorkspaceApp(['start'], { env: { ...envBase, BROWSER: 'none' } });
              app.stderr.on('data', dd => process.stderr.write(`[app][err] ${dd}`));
              app.stdout.on('data', dd => process.stdout.write(`[app] ${dd}`));
              processes.appPid = app.pid;
            } catch (err) {
              console.error('[e2e][setup] auto minimal rebuild failed:', err.message);
            }
          })();
        }
      }
      process.stderr.write(`[app][err] ${d}`);
    });
    app.stdout.on('data', d => process.stdout.write(`[app] ${d}`));

    // If Yarn prints missing state error quickly, auto-run install then restart once
    const restartIfNeeded = setTimeout(async () => {
      if (/install-state/i.test(firstErrorChunk) || /findPackageLocation/i.test(firstErrorChunk)) {
        console.log('[e2e][setup] detected Yarn state file error; retrying after fresh install');
        try { app.kill('SIGTERM'); } catch { /* ignore */ }
  await ensureInstallIfNeeded('retry');
  app = spawnWorkspaceApp(['start'], { env: { ...envBase, BROWSER: 'none' } });
        app.stdout.on('data', d => process.stdout.write(`[app] ${d}`));
        app.stderr.on('data', d => process.stderr.write(`[app][err] ${d}`));
        processes.appPid = app.pid;
      }
    }, 2500);
    app.on('exit', code => {
      clearTimeout(restartIfNeeded);
      if (code !== 0) console.error(`[e2e][setup] app process exited early with code ${code}`);
    });
    processes.appPid = app.pid;
    return app;
  }

  const total = stage('total');

  // 1. Start (or reuse) mock server (always attempt reuse if healthy, even without reuse flag)
  const sMock = stage('mock_server');
  const MOCK_PORT = process.env.MOCK_PORT || '7007'; // align with static discovery baseUrl (7007)
  const mockHealthUrl = `http://localhost:${MOCK_PORT}/api/costscope/healthz`;
  const mockHealthy = await isReachable(mockHealthUrl);
  if (mockHealthy) {
    console.log('[e2e][setup] mock server already healthy (auto-reuse)');
    sMock.end({ info: 'reused' });
  } else {
  console.log(`[e2e][setup] starting mock server :${MOCK_PORT}`);
    let spawnFailed = false;
    const mock = spawn('node', ['scripts/mock-server.cjs'], {
      cwd: repoRoot,
      env: { ...envBase, PORT: MOCK_PORT },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    mock.on('error', err => {
      spawnFailed = true;
      console.error('[e2e][setup] mock spawn error', err);
    });
    processes.mockPid = mock.pid;
    mock.stdout.on('data', d => process.stdout.write(`[mock] ${d}`));
    mock.stderr.on('data', d => {
      const text = d.toString();
      // Detect EADDRINUSE quickly and attempt fallback reuse if server became healthy between check & spawn (race) or another instance running
      if (/EADDRINUSE/.test(text)) {
        console.warn('[e2e][setup] mock port 7100 in use; checking if existing server is healthy for reuse');
      }
      process.stderr.write(`[mock][err] ${d}`);
    });
    try {
      await waitFor(mockHealthUrl, { timeoutMs: 60000 });
      console.log('[e2e][setup] mock healthz OK');
      sMock.end();
    } catch (e) {
      if (spawnFailed || /EADDRINUSE/.test(e.message) || await isReachable(mockHealthUrl)) {
        // Another process grabbed the port but is healthy; treat as reuse
        console.log('[e2e][setup] detected existing mock after spawn attempt; reusing');
        sMock.end({ info: 'reuse-after-eaddrinuse' });
      } else {
        throw e;
      }
    }
  }

  // 2. No scaffold step (example app is part of repo)
  const sScaffold = stage('scaffold');
  const appPkg = path.join(appDir, 'package.json');
  if (!fs.existsSync(appPkg)) throw new Error('example app missing at ' + appPkg);
  sScaffold.end({ info: 'present' });

  // 3. Start (or reuse) Backstage app
  const sApp = stage('app_start');
  if (reuse) {
    const appReady = await isReachable('http://localhost:3000/costscope');
    if (appReady) {
      console.log('[e2e][setup] reuse: app already serving /costscope');
      sApp.end({ info: 'reused' });
    } else {
      console.log('[e2e][setup] reuse: starting example app (port 3000)');
      // Lightweight plugin refresh: build in-place only if sources changed (mtime heuristic) – skip costly yarn add
      const sPlugin = stage('plugin_refresh');
      try {
        const srcDir = path.join(repoRoot, 'src');
        const distDir = path.join(repoRoot, 'dist');
        let needBuild = true;
        try {
          const srcStat = fs.statSync(srcDir);
          const distStat = fs.statSync(distDir);
          if (distStat.mtimeMs > srcStat.mtimeMs) needBuild = false; // recent build newer than sources
        } catch { /* ignore */ }
        if (needBuild) {
          await new Promise((resolve, reject) => {
            const b = spawn('yarn', ['build:size'], { cwd: repoRoot, env: envBase, stdio: 'ignore' });
            b.on('exit', code => (code === 0 ? resolve() : reject(new Error(`build exited ${code}`))));
          });
        }
        sPlugin.end({ info: needBuild ? 'rebuilt' : 'skipped' });
      } catch (e) {
        sPlugin.end({ info: 'failed' });
        console.warn('[e2e][setup] plugin lightweight refresh failed (continuing):', e.message);
      }
      // Ensure we don't conflict with an existing dev server that lacks proxy
      await killPort(3000);
      const app = await startExampleApp('reuse');
      try {
        await waitFor('http://localhost:3000/costscope', { timeoutMs: 180000 });
      } catch (e) {
        console.error('[e2e][setup] timeout waiting for /costscope (reuse path)');
        throw e;
      }
      console.log('[e2e][setup] /costscope reachable (reuse start)');
      sApp.end();
    }
  } else {
    // Attempt to free port 3000 preemptively if a zombie process left it bound (minimal dev server can exit early with EADDRINUSE otherwise)
    await killPort(3000);
    console.log('[e2e][setup] starting example dev server (port 3000)' + (useMinimal ? ' [minimal]' : ' [backstage]'));
    const app = await startExampleApp('fresh');
    app.on('exit', code => { if (code !== 0) console.error(`[e2e][setup] app process exited early code ${code}`); });
    try {
      await waitFor('http://localhost:3000/costscope', { timeoutMs: 180000 });
    } catch (e) {
      console.error('[e2e][setup] timeout waiting for /costscope');
      throw e;
    }
    console.log('[e2e][setup] /costscope reachable');
    sApp.end();
  }

  fs.writeFileSync(stateFile, JSON.stringify(processes, null, 2));
  console.log('[e2e][setup] state saved', stateFile);
  total.end();
  // Summary table
  const summary = timing.map(t => `${t.name}=${t.ms}ms`).join(' ');
  console.log(`[e2e][setup][summary] ${summary}`);
};
