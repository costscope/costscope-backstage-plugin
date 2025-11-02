/*
 Simple local mock backend for Costscope plugin development & Storybook.

 Completed mock surface (subset of planned FinOps Insights API):
   GET /api/costscope/providers
   GET /api/costscope/datasets?project=foo
   GET /api/costscope/costs/summary?period=P30D&project=foo
   GET /api/costscope/costs/daily?period=P30D&project=foo
   GET /api/costscope/breakdown?by=ServiceCategory&period=P30D&project=foo
   GET /api/costscope/alerts?project=foo
   GET /api/costscope/healthz

 Developer conveniences:
   - Deterministic pseudo‑random data per (project, period, dimension) seed.
   - Optional latency simulation via LATENCY_MS env or ?delay=NNN.
   - Error injection via ?forceError=500 (status code) or ?forceError=timeout.
   - Basic structured console logging with correlation id echo.

 Run with: yarn mock (see package.json script). By default listens on :7007 and
 exposes a Backstage discovery-compatible base url at /api/costscope.

 You can override port via PORT env. Data is generated deterministically per
 project + period to keep charts stable across refreshes.
*/
// Node/TS setup
/* eslint-env node */
/* global process */
/* eslint-disable import/order */
// Prefer ESM-style imports to remain compatible whether ts-node compiles as CJS or ESM
import * as nodeCrypto from 'crypto';
import cors from 'cors';
import express from 'express';

// --- Middleware -----------------------------------------------------------

const app = express();

// CORS: allow credentials + explicit origin (cannot be *) when frontend sends cookies/credentials
const ALLOWED_ORIGIN = process.env.MOCK_ORIGIN || 'http://localhost:3000';
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

app.use((req, res, next) => {
  // Allow simple latency simulation (bounded to prevent resource exhaustion)
  const MAX_DELAY_MS = 5000; // cap delay to 5s to avoid unbounded timers
  const parseNum = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const delayParam = req.query.delay !== undefined ? parseNum(req.query.delay) : undefined;
  const envLatency = process.env.LATENCY_MS !== undefined ? parseNum(process.env.LATENCY_MS) : 0;
  const requested = (delayParam ?? envLatency ?? 0) as number;
  const latency = Math.max(0, Math.min(MAX_DELAY_MS, requested));
  if (latency > 0) {
    const t = setTimeout(next, latency);
    // Clear the timer if the client disconnects early to avoid piling timers.
    res.on('close', () => clearTimeout(t));
  } else {
    next();
  }
});

app.use((req, res, next) => {
  // Error injection (bounded timeout or explicit status code)
  // New alias: `?timeout` will behave like `?forceError=timeout`
  // IMPORTANT: To avoid resource exhaustion, simulated timeouts are bounded
  // and will auto-complete with a 504 after a short period.
  const MAX_TIMEOUT_MS = 5000; // cap simulated hang to 5s
  const parseNum = (v: unknown): number | undefined => {
    // Accept only positive integer strings or finite numbers; treat '' and non-numeric as undefined
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (typeof v === 'string' && v.trim() !== '' && /^\d+$/.test(v.trim())) {
      return parseInt(v.trim(), 10);
    }
    return undefined;
  };

  const requestSimulatedTimeout =
    req.query.timeout !== undefined || String(req.query.forceError || '') === 'timeout';

  if (requestSimulatedTimeout) {
  const fromQuery = parseNum(req.query.timeout as any);
    const requested = fromQuery ?? MAX_TIMEOUT_MS;
    const delay = Math.max(0, Math.min(MAX_TIMEOUT_MS, requested));

    // Set a bounded timer and clear it if the client disconnects.
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Simulated timeout (bounded)', timeoutMs: delay });
      }
    }, delay);
    res.on('close', () => clearTimeout(timer));
    return; // do not call next(); this middleware will respond within the bound
  }

  if (req.query.forceError) {
    const v = String(req.query.forceError);
    const code = Number(v) || 500;
    return res.status(code).json({ error: `Forced error ${code}` });
  }
  next();
});

app.use((req, res, next) => {
  const started = Date.now();
  const cid = (req.headers['x-correlation-id'] as string) || seededId();
  (req as any).cid = cid;
  res.setHeader('x-mock-correlation-id', cid);
  res.on('finish', () => {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        cid,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - started,
      }),
    );
  });
  next();
});

// Helper to get seeded pseudo-random generator for stable mock data
function seededRng(seed: string) {
  let h = nodeCrypto.createHash('sha256').update(seed).digest();
  let idx = 0;
  return () => {
    if (idx >= h.length) {
      h = nodeCrypto.createHash('sha256').update(h).digest();
      idx = 0;
    }
    return h[idx++] / 255; // 0..1
  };
}

// If a caller supplies ?seed=foo, fold it into the deterministic seed chain
function withQuerySeed(req: any, base: string): string {
  const q = req.query.seed as string | undefined;
  return q ? `${base}:seed:${q}` : base;
}

function parsePeriod(period: string | undefined): number {
  // Supports forms like P30D, P7D; default 30
  if (!period) return 30;
  const m = /P(\d+)D/.exec(period);
  return m ? Math.min(120, parseInt(m[1], 10)) : 30;
}

function seededId() {
  return nodeCrypto.randomUUID?.() || Math.random().toString(36).slice(2, 12);
}

// Shared cost sequence generator (mirrors /costs/daily logic) so summary
// aggregates match the daily endpoint totals.
function generateDailyCosts({ project, period }: { project: string; period: string }) {
  const days = parsePeriod(period);
  const rng = seededRng(`overview:${project}:${period}`);
  const today = new Date();
  const data = Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getTime() - (days - 1 - i) * 24 * 3600 * 1000);
    const base = 100 + 200 * Math.abs(Math.sin(i / 5));
    const cost = +(base * (0.9 + rng() * 0.2)).toFixed(2);
    return { date: d.toISOString().slice(0, 10), cost };
  });
  return data;
}

// Create a reusable API router so we can mount under multiple base paths
const api = express.Router();

// Optional runtime validation flag (dev safety)
const RUNTIME_VALIDATE = process.env.COSTSCOPE_RUNTIME_VALIDATE === 'true';
let schemaMap: Record<string, any> | null = null;
async function ensureSchemas() {
  if (!RUNTIME_VALIDATE || schemaMap) return;
  try {
    // dynamic import to keep main path light
    const mods = await import('./validation/schemas');
    schemaMap = mods.schemaMap;
  } catch (e) {
    console.warn('[mock] validation schema load failed (continuing)', e);
    schemaMap = {}; // prevent repeat attempts
  }
}

function maybeValidate(path: string, payload: any) {
  if (!RUNTIME_VALIDATE || !schemaMap) return;
  const schema = schemaMap[path];
  if (!schema) return; // no schema for path
  const res = schema.safeParse(payload);
  if (!res.success) {
    console.warn('[mock] schema validation failure', path, res.error.issues.slice(0, 3));
  }
}

// --- Providers ------------------------------------------------------------

api.get('/providers', async (_req, res) => {
  await ensureSchemas();
  const providers = ['aws', 'azure', 'gcp'];
  // Minimal conforming surface: id, name, status? — remaining fields are mock-only
  const rows = providers.map((p) => ({
    id: p,
    name: p.toUpperCase(),
    status: 'ok',
    // mock-only extras (excluded from whitelist required/optional)
    // displayName: p.toUpperCase(),
    // services: 10 + Math.floor(rng() * 50),
    // lastUpdated: new Date(Date.now() - rng() * 6 * 3600_000).toISOString(),
  }));
  maybeValidate('/providers', rows);
  res.json(rows);
});

// --- Datasets -------------------------------------------------------------

api.get('/datasets', async (req, res) => {
  await ensureSchemas();
  const project = (req.query.project as string) || 'global';
  const rng = seededRng(withQuerySeed(req, `datasets:${project}`));
  const providers = ['aws', 'azure', 'gcp'];
  const now = Date.now();
  const datasets = providers.map((p) => {
    const days = 30 + Math.floor(rng() * 15);
    const start = new Date(now - days * 24 * 3600_000);
    const end = new Date(now - 24 * 3600_000);
    return {
      id: `${p}-${project}`,
      provider: p,
      status: 'ready',
      records: 50_000 + Math.floor(rng() * 200_000),
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: end.toISOString().slice(0, 10),
      createdAt: new Date(now - rng() * 2 * 3600_000).toISOString(), // renamed from lastIngestedAt
      // mock-only: project, bytes
    };
  });
  maybeValidate('/datasets', datasets);
  res.json(datasets);
});

// Filtered search with deterministic pool and filters
// Example:
//   GET <base>/datasets/search?project=foo&provider=aws&from=2025-07-01&to=2025-08-15&minRecords=60000&status=ready&limit=10
api.get('/datasets/search', async (req, res) => {
  await ensureSchemas();
  const project = (req.query.project as string) || 'global';
  const providers = ['aws', 'azure', 'gcp'];
  // Freeze "now" for deterministic snapshots when a seed is provided so that
  // timestamp fields (periodStart/periodEnd/createdAt) remain stable across test runs.
  // Use a fixed anchor date rather than current wall clock.
  const now = req.query.seed ? Date.UTC(2025, 6, 1, 0, 0, 0, 0) : Date.now(); // 2025-07-01T00:00:00Z

  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const parseISO = (s?: string) => (s ? new Date(`${s}T00:00:00Z`) : undefined);

  const providerFilterRaw = req.query.provider;
  const providerFilter: string[] = Array.isArray(providerFilterRaw)
    ? (providerFilterRaw as string[])
    : providerFilterRaw
      ? String(providerFilterRaw)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const statusFilter = (req.query.status as string | undefined)?.toLowerCase();
  const from = parseISO(req.query.from as string | undefined);
  const to = parseISO(req.query.to as string | undefined);
  const minRecords = req.query.minRecords ? Number(req.query.minRecords) : undefined;
  const maxRecords = req.query.maxRecords ? Number(req.query.maxRecords) : undefined;
  const limit = Math.max(1, Math.min(100, req.query.limit ? Number(req.query.limit) : 20));

  // Build a deterministic pool per (project)
  const pool: any[] = [];
  // Use a stable seed base that ignores transient query params beyond project to keep deterministic snapshot hash.
  const baseSeed = withQuerySeed(req, `datasets-search:${project}`);
  for (const p of providers) {
    const rng = seededRng(`${baseSeed}:${p}`);
    const count = 8; // per provider
    for (let i = 0; i < count; i++) {
      const spreadDays = 20 + Math.floor(rng() * 40); // 20..60 days
      const endOffsetDays = 1 + Math.floor(rng() * 40) + i; // stagger per i
      const end = new Date(now - endOffsetDays * 24 * 3600_000);
      const start = new Date(end.getTime() - spreadDays * 24 * 3600_000);
      const statuses = ['ready', 'ingesting', 'error'] as const;
      const status = statuses[Math.floor(rng() * statuses.length)];
      const rec = 50_000 + Math.floor(rng() * 250_000);
      pool.push({
        id: `${p}-${project}-${i}`,
        provider: p,
        status,
        records: rec,
        periodStart: toISO(start),
        periodEnd: toISO(end),
        createdAt:
          status === 'ready'
            ? new Date(now - rng() * 2 * 3600_000).toISOString()
            : new Date(now - (2 + rng() * 24) * 3600_000).toISOString(),
      });
    }
  }

  // Apply filters
  const filtered = pool
    .filter((d) => (providerFilter.length ? providerFilter.includes(d.provider) : true))
    .filter((d) => (statusFilter ? d.status === statusFilter : true))
    .filter((d) => {
      const dStart = parseISO(d.periodStart)!;
      const dEnd = parseISO(d.periodEnd)!;
      if (from && dEnd < from) return false; // ends before window
      if (to && dStart > to) return false; // starts after window
      return true; // overlaps
    })
    .filter((d) => (minRecords !== undefined ? d.records >= minRecords : true))
    .filter((d) => (maxRecords !== undefined ? d.records <= maxRecords : true))
    .sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : a.periodEnd > b.periodEnd ? -1 : 0))
    .slice(0, limit);

  maybeValidate('/datasets/search', filtered);
  res.json(filtered);
});

// --- Costs: Summary -------------------------------------------------------

api.get('/costs/summary', async (req, res) => {
  await ensureSchemas();
  const period = String(req.query.period || 'P30D');
  const project = (req.query.project as string) || 'global';
  const projectSalted = (req.query.seed as string)
    ? `${project}:seed:${String(req.query.seed)}`
    : project;
  const current = generateDailyCosts({ project: projectSalted, period });
  const prev = generateDailyCosts({ project: `${projectSalted}:prev`, period });
  const totalCost = current.reduce((s, d) => s + d.cost, 0);
  const prevTotal = prev.reduce((s, d) => s + d.cost, 0);
  const deltaPct = prevTotal === 0 ? 0 : (totalCost - prevTotal) / prevTotal;
  const payload = {
    period,
    totalCost: +totalCost.toFixed(2),
    prevPeriodCost: +prevTotal.toFixed(2),
    deltaPct: +deltaPct.toFixed(4),
    currency: 'USD',
  };
  maybeValidate('/costs/summary', payload);
  res.json(payload);
});

api.get('/costs/daily', (req, res) => {
  const period = String(req.query.period || 'P30D');
  const project = (req.query.project as string) || 'global';
  const projectSalted = (req.query.seed as string)
    ? `${project}:seed:${String(req.query.seed)}`
    : project;
  res.json(generateDailyCosts({ project: projectSalted, period }));
});

api.get('/breakdown', async (req, res) => {
  await ensureSchemas();
  const by = (req.query.by as string) || 'ServiceCategory';
  const period = String(req.query.period || 'P30D');
  const project = (req.query.project as string) || 'global';
  const rng = seededRng(withQuerySeed(req, `breakdown:${project}:${period}:${by}`));
  const dims =
    by === 'Region' || by === 'RegionId'
      ? ['us-east-1', 'us-west-2', 'eu-central-1']
      : ['Compute', 'Storage', 'Networking', 'Database'];
  const rows = dims.map((dim) => {
    const cost = +(50 + rng() * 450).toFixed(2);
    const deltaPct = +((rng() - 0.5) * 0.4).toFixed(4); // -20%..+20%
    return { dim, cost, deltaPct };
  });
  rows.sort((a, b) => b.cost - a.cost);
  maybeValidate('/breakdown', rows);
  res.json(rows);
});

api.get('/alerts', async (req, res) => {
  await ensureSchemas();
  const project = (req.query.project as string) || 'global';
  const rng = seededRng(withQuerySeed(req, `alerts:${project}`));
  // Return a stable set with varied severities (info, warn, critical)
  const severities: Array<'info' | 'warn' | 'critical'> = ['info', 'warn', 'critical'];
  const messages: Record<(typeof severities)[number], string[]> = {
    info: ['No anomalies detected', 'Spend within expected range'],
    warn: ['Gradual increase in Storage costs', 'Higher than usual data transfer'],
    critical: [
      'Spike detected in Compute spend (>25% above 7d avg)',
      'Budget threshold exceeded for project',
    ],
  };
  const pick = (arr: string[]) => arr[Math.floor(rng() * arr.length)];
  const alerts = severities.map((sev, i) => ({
    id: `${project}-${sev}-${i}`,
    severity: sev,
    message: pick(messages[sev]),
  }));
  maybeValidate('/alerts', alerts);
  res.json(alerts);
});
// Basic root for health
api.get('/healthz', async (_req, res) => {
  await ensureSchemas();
  const payload = { status: 'ok' };
  maybeValidate('/healthz', payload);
  res.json(payload);
});

// Mount router under the preferred base
app.use('/api/costscope', api);

// Minimal guest auth refresh mock to silence CORS/auth noise when using Backstage guest provider.
// Returns a lightweight identity object; not for production use.
app.get('/api/auth/guest/refresh', (_req, res) => {
  // Provide a JWT-shaped opaque token so Backstage guest auth code that attempts
  // to base64 decode header/payload doesn't throw. Contents are non-sensitive.
  const B: any = (globalThis as any).Buffer;
  const header = B.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = B.from(
    JSON.stringify({
      sub: 'user:default/guest',
      iss: 'costscope-mock',
      aud: 'backstage',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    }),
  ).toString('base64url');
  const token = `${header}.${payload}.mocksig`;
  res.json({
    profile: { email: 'guest@example.com', displayName: 'Guest User' },
    providerInfo: {},
    backstageIdentity: {
      identity: {
        type: 'user',
        userEntityRef: 'user:default/guest',
        ownershipEntityRefs: ['user:default/guest'],
      },
      token,
    },
  });
});

// --- Minimal stubs for common Backstage core backend routes -----------------
// These suppress noisy 404s when running only the mock Costscope API without a
// full Backstage backend. They intentionally return empty data structures.

// Catalog entities list (various filters) – always empty array
app.get('/api/catalog/entities', (_req, res) => {
  res.json([]);
});

// Catalog entity facets – empty facets object
app.get('/api/catalog/entity-facets', (_req, res) => {
  res.json({});
});

// Permission authorize batch – ALLOW everything
app.post('/api/permission/authorize', (req, res) => {
  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : [];
  res.json({
    items: items.map((it: any) => ({ id: it.id, decision: 'ALLOW' })),
  });
});

// Notifications status – no notifications
app.get('/api/notifications/status', (_req, res) => {
  res.json({ notifications: 0 });
});

// Signals (websocket) – provide an HTTP 200 placeholder so the frontend fails fast.
app.get('/api/signals', (_req, res) => {
  res.status(200).json({ ok: true, note: 'signals websocket not implemented in mock' });
});

// Capture the server instance so tests can await 'listening' and close it.
const port = Number(process.env.PORT || 7007);
const server = app.listen(port, () => {
  // Log using 127.0.0.1 to be consistent with environments where localhost DNS is unreliable
  console.log(`Costscope mock backend listening on http://127.0.0.1:${port}`);
  console.log(`CORS origin: ${ALLOWED_ORIGIN} (credentials enabled)`);
  console.log('Endpoints:');
  const bases = ['/api/costscope'];
  const paths = [
    'GET {base}/providers',
    'GET {base}/datasets',
    'GET {base}/datasets/search',
    'GET {base}/costs/summary',
    'GET {base}/costs/daily',
    'GET {base}/breakdown',
    'GET {base}/alerts',
    'GET {base}/healthz',
  ];
  bases.forEach((b) => paths.forEach((p) => console.log(`  ${p.replace('{base}', b)}`)));
  console.log(
    'Dev helpers: ?delay=200  |  ?forceError=500  |  ?forceError=timeout  |  ?timeout  |  ?seed=A',
  );
});

// Export for CommonJS (tests importing mock-server.cjs) and ES module consumers.
// @ts-ignore
if (typeof module !== 'undefined') module.exports = server;
export default server;
