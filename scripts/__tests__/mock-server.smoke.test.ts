/**
 * @jest-environment node
 */
import { spawn, ChildProcess } from 'child_process';

// Node 20+ has global fetch; keep type import for clarity
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {} from 'node-fetch';

const BASE_PATH = '/api/costscope';

function findFreePort(start = 7100): number {
  // Simple pseudo-random port in range 7100-7999 to reduce collision chance in CI
  const offset = Math.floor(Math.random() * 800);
  return start + offset;
}

function startServer(port: number) {
  const child = spawn(
    process.execPath, // node
    [
      // Use the repo-root CommonJS bootstrap that registers ts-node and loads the TS server
      // Resolve absolute path so tests passing when cwd is the package working directory.
      require('path').join(__dirname, '..', 'mock-server.cjs'),
    ],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: String(port),
        TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'commonjs' }),
      },
      cwd: process.cwd(),
    },
  );
  return child;
}

async function waitForHealthy(baseUrl: string, timeoutMs = 30000) {
  const start = Date.now();
  // poll health until success or timeout
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(`${baseUrl}${BASE_PATH}/healthz`, { cache: 'no-store' } as any);
      if (res.ok) return;
    } catch (_e) {
      // ignore until timeout
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error('Mock server did not become healthy in time');
    }
    await new Promise((r) => setTimeout(r, 120));
  }
}

describe('mock-server e2e smoke', () => {
  jest.setTimeout(40000);
  let child: ChildProcess | undefined;
  let baseUrl = '';

  beforeAll(async () => {
    const port = findFreePort();
    // Use 127.0.0.1 to avoid localhost DNS resolution issues in some CI/runners
    baseUrl = `http://127.0.0.1:${port}`;
    child = startServer(port);

    let listeningLogged = false;
    const logs: string[] = [];
    const push = (pfx: string, d: any) => {
      const text = d.toString();
      logs.push(text);
      process.stderr.write(`[mock:${pfx}] ${text}`);
      if (/listening on/.test(text)) listeningLogged = true;
    };
    child.stdout?.on('data', (d) => push('out', d));
    child.stderr?.on('data', (d) => push('err', d));
    child.on('exit', (code) => {
      if (!listeningLogged) {
        // Surface early crash immediately for clearer diagnosis
        throw new Error(
          `Mock server child exited early (code ${code}) before listening. Logs:\n${logs.join('')}`,
        );
      }
    });

    // Wait until we see listening log before polling health to reduce noisy connection refusals
    const startWait = Date.now();
    while (!listeningLogged && Date.now() - startWait < 10000) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 50));
    }
    await waitForHealthy(baseUrl);
  });

  afterAll(async () => {
    if (child && !child.killed) {
      child.kill();
    }
  });

  it('healthz returns ok', async () => {
    const res = await fetch(`${baseUrl}${BASE_PATH}/healthz`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toEqual({ status: 'ok' });
  });

  it('daily overview is deterministic by (project,period)', async () => {
    const url = `${baseUrl}${BASE_PATH}/costs/daily?period=P5D&project=alpha`;
    const [a, b] = await Promise.all([
      fetch(url).then((r) => r.json()),
      fetch(url).then((r) => r.json()),
    ]);
    expect(a).toEqual(b);
    expect(Array.isArray(a)).toBe(true);
    expect(a).toHaveLength(5);

    const otherProject = await fetch(
      `${baseUrl}${BASE_PATH}/costs/daily?period=P5D&project=beta`,
    ).then((r) => r.json());
    expect(otherProject).not.toEqual(a);

    const otherPeriod = await fetch(
      `${baseUrl}${BASE_PATH}/costs/daily?period=P7D&project=alpha`,
    ).then((r) => r.json());
    expect(otherPeriod).not.toEqual(a);
  });

  it('summary correlates with daily (deterministic)', async () => {
    const period = 'P10D';
    const project = 'alpha';
    const daily = (await fetch(
      `${baseUrl}${BASE_PATH}/costs/daily?period=${period}&project=${project}`,
    ).then((r) => r.json())) as Array<{ cost: number }>;
    const summary = (await fetch(
      `${baseUrl}${BASE_PATH}/costs/summary?period=${period}&project=${project}`,
    ).then((r) => r.json())) as any;

    const sum = +daily.reduce((s, d) => s + d.cost, 0).toFixed(2);
    expect(summary.totalCost).toBe(sum);
    expect(summary.period).toBe(period);
    // project is not returned in minimal summary surface
    expect(typeof summary.deltaPct).toBe('number');
  });

  it('breakdown and alerts return stable arrays for same seed', async () => {
    const by = 'ServiceCategory';
    const p = 'P14D';
    const proj = 'alpha';
    const [b1, b2] = await Promise.all([
      fetch(`${baseUrl}${BASE_PATH}/breakdown?by=${by}&period=${p}&project=${proj}`).then((r) =>
        r.json(),
      ),
      fetch(`${baseUrl}${BASE_PATH}/breakdown?by=${by}&period=${p}&project=${proj}`).then((r) =>
        r.json(),
      ),
    ]);
    expect(b1).toEqual(b2);
    expect(Array.isArray(b1)).toBe(true);
    expect(b1.length).toBeGreaterThan(0);

    const [a1, a2] = await Promise.all([
      fetch(`${baseUrl}${BASE_PATH}/alerts?project=${proj}`).then((r) => r.json()),
      fetch(`${baseUrl}${BASE_PATH}/alerts?project=${proj}`).then((r) => r.json()),
    ]);
    expect(a1).toEqual(a2);
    expect(Array.isArray(a1)).toBe(true);
  });

  it('datasets/search respects filters and limit', async () => {
    const res = await fetch(
      `${baseUrl}${BASE_PATH}/datasets/search?project=foo&provider=aws,azure&status=ready&limit=3`,
    );
    expect(res.status).toBe(200);
    const items = (await res.json()) as Array<{ provider: string; status: string }>;
    expect(items.length).toBeLessThanOrEqual(3);
    for (const it of items) {
      expect(['aws', 'azure']).toContain(it.provider);
      expect(it.status).toBe('ready');
    }
  });

  it('error injection: forced HTTP and timeout', async () => {
    const forced = await fetch(
      `${baseUrl}${BASE_PATH}/costs/daily?period=P3D&project=x&forceError=503`,
    );
    expect(forced.status).toBe(503);
    const body = await forced.json();
    expect(body).toHaveProperty('error');

    // timeout/hang path; use AbortSignal.timeout to ensure test completes
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(new Error('timeout')), 400);
    await expect(
      fetch(`${baseUrl}${BASE_PATH}/costs/daily?period=P3D&project=x&timeout`, {
        signal: ac.signal as any,
      } as any),
    ).rejects.toThrow();
    clearTimeout(t);
  });
});
