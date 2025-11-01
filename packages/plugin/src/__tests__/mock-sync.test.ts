/**
 * @jest-environment node
 *
 * Minimal mock ↔ contract sync test.
 * Ensures deterministic output (sha256) for selected endpoints under seed=SYNC
 * and enforces whitelisted field sets (no unexpected keys creeping in).
 */
import crypto from 'crypto';
import {
  providersWhitelist,
  datasetsWhitelist,
  summaryWhitelist,
  breakdownWhitelist,
  alertsWhitelist,
  healthWhitelist,
} from '../contract/whitelists';

// Use a random available port (0 lets the OS assign) to avoid clashes with other tests spawning the mock server.
// Capture the assigned port from the server instance after requiring.
const desiredPort = process.env.PORT && process.env.PORT !== '0' ? process.env.PORT : '0';
process.env.PORT = desiredPort;

// Re-use the running mock server by importing its entry (spawns listener) OR
// build an express app factory if later refactored. For now we import the CJS launcher.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const imported = require('../../scripts/mock-server.cjs');
// Support both direct server export and default export forms.
const server: import('http').Server = imported.default || imported;

let base = '';
beforeAll(async () => {
  // If port was 0, wait until 'listening' to read the actual assigned port
  await new Promise<void>((resolve) => {
    if (server.listening) return resolve();
    server.once('listening', () => resolve());
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : process.env.PORT;
  // Use 127.0.0.1 instead of localhost to avoid DNS issues in some CI runners
  base = `http://127.0.0.1:${port}/api/costscope`;
});

afterAll((done) => {
  try {
    server.close(() => done());
  } catch {
    done();
  }
});

function hashBody(body: unknown) {
  const json = JSON.stringify(body);
  return crypto.createHash('sha256').update(json).digest('hex');
}

function expectFields(
  obj: Record<string, any>,
  wl: { required: readonly string[]; optional: readonly string[] },
) {
  wl.required.forEach((k) => expect(obj).toHaveProperty(k));
  const allowed = new Set([...wl.required, ...wl.optional]);
  Object.keys(obj).forEach((k) => {
    if (!allowed.has(k)) {
      // Allow mock-only metadata (documented) prefixed with '_' if introduced later.
      expect(k).toMatch(/^_/); // fail if truly unknown
    }
  });
}

describe('mock sync', () => {
  it('providers deterministic + whitelist', async () => {
    const res = await fetch(`${base}/providers?seed=SYNC`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    body.forEach((p: any) => expectFields(p, providersWhitelist));
    const h = hashBody(body);
    // Deterministic snapshot hashes.
    // Update workflow:
    //   UPDATE_SNAPSHOTS=1 yarn test src/__tests__/mock-sync.test.ts
    // Then copy the printed sha256 values here (PROVIDERS_HASH, DATASETS_HASH) to lock them.
    // This guards against accidental mock output drift (field changes, ordering, seed logic).
    // NOTE: If intentional, update whitelists & README table accordingly before bumping hashes.
    const expected = '9681b17d27f4f6539cae06974df4d2235948f7555eb03d799f8ef3b211c1f82a';
    if (process.env.UPDATE_SNAPSHOTS) {
      console.log('providers sha256:', h);
    } else {
      expect(h).toBe(expected);
    }
  });

  it('datasets search deterministic + whitelist', async () => {
    const res = await fetch(`${base}/datasets/search?project=foo&limit=5&seed=SYNC`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    body.forEach((d: any) => expectFields(d, datasetsWhitelist));
    const h = hashBody(body);
    const expected = '64a60c23370f98c852551d326d2e5e4b3e0a930fb1f3bb29b3690935568bcfe6';
    if (process.env.UPDATE_SNAPSHOTS) {
      console.log('datasets search sha256:', h);
    } else {
      expect(h).toBe(expected);
    }
  });

  it('summary fields', async () => {
    const res = await fetch(`${base}/costs/summary?period=P7D&seed=SYNC`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expectFields(body, summaryWhitelist);
  });

  it('breakdown fields', async () => {
    const res = await fetch(`${base}/breakdown?by=ServiceCategory&period=P7D&seed=SYNC`);
    expect(res.status).toBe(200);
    const body = await res.json();
    body.forEach((row: any) => expectFields(row, breakdownWhitelist));
  });

  it('alerts fields', async () => {
    const res = await fetch(`${base}/alerts?project=foo&seed=SYNC`);
    expect(res.status).toBe(200);
    const body = await res.json();
    body.forEach((row: any) => expectFields(row, alertsWhitelist));
  });

  it('health fields', async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expectFields(body, healthWhitelist);
  });
});
