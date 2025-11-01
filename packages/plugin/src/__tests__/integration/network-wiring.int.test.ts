import { spawn } from 'node:child_process';
import path from 'node:path';

function waitFor(url: string, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const tick = async () => {
      try {
        const r = await fetch(url);
        if (r.ok) return resolve();
      } catch {}
      if (Date.now() - start > timeoutMs) return reject(new Error('timeout ' + url));
      setTimeout(tick, 300);
    };
    tick();
  });
}

describe('dev network wiring (mock -> proxy)', () => {
  let procs: Array<{ p: any; name: string }>; const kills: Array<() => void> = [];
  beforeEach(() => { procs = []; });
  afterEach(() => { for (const k of kills.reverse()) { try { k(); } catch {} } });

  it('proxies /api/costscope via mock-backend to upstream mock-server', async () => {
    // 1) Start upstream data mock on random port
    const upstreamPort = 7207 + Math.floor(Math.random() * 300);
    const repoRoot = path.join(__dirname, '..', '..', '..', '..');
    const mockServer = spawn('node', ['scripts/mock-server.cjs'], { cwd: repoRoot, env: { ...process.env, PORT: String(upstreamPort) }, stdio: 'inherit' });
    procs.push({ p: mockServer, name: 'mock-server' });
    kills.push(() => mockServer.kill('SIGTERM'));
    await waitFor(`http://localhost:${upstreamPort}/api/costscope/healthz`, 30000);

    // 2) Start proxy on random port pointing to upstream
    const proxyPort = 7308 + Math.floor(Math.random() * 300);
    const proxy = spawn('yarn', ['workspace', 'mock-backend', 'start'], {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(proxyPort), MOCK_TARGET: `http://localhost:${upstreamPort}` },
      stdio: 'inherit',
    });
    procs.push({ p: proxy, name: 'mock-backend' });
    kills.push(() => proxy.kill('SIGTERM'));
    await waitFor(`http://localhost:${proxyPort}/api/costscope/healthz`, 30000);

    // 3) Verify a couple of endpoints through proxy
    const health = await fetch(`http://localhost:${proxyPort}/api/costscope/healthz`);
    expect(health.ok).toBe(true);
    const daily = await fetch(`http://localhost:${proxyPort}/api/costscope/costs/daily?period=P7D`);
    expect(daily.ok).toBe(true);
    const breakdown = await fetch(`http://localhost:${proxyPort}/api/costscope/breakdown?by=ServiceCategory&period=P7D`);
    expect(breakdown.ok).toBe(true);
  });
});
