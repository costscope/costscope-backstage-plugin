// Validation telemetry (dev-only).
import { __DEV } from '../../build-consts';
import { table, log, info } from '../../utils/logger';
// Collects counts & timing for runtime schema validation when COSTSCOPE_RUNTIME_VALIDATE=true.
// When window.__COSTSCOPE_DEBUG_VALIDATION === true (or globalThis flag), a console.table
// summary is emitted via printValidationSummary(). No automatic spam except every 25 events.
// Validation telemetry: counts of successful / failed validations and average parse time.

export interface ValidationEventRecord {
  path: string;              // request path used to infer schema
  success: boolean;          // true if parse ok
  durationMs: number;        // parse duration
  schema: 'overview' | 'breakdown' | 'alerts' | 'unknown';
  ts: number;                // timestamp
  errorMessage?: string;     // zod error message (truncated)
  schemaHash?: string;       // hash at time of validation (for drift correlation)
}

const validationRecords: ValidationEventRecord[] = [];

// Lightweight dev-only counters to compute failure rate quickly and expose to tooling.
type SchemaKey = 'overview' | 'breakdown' | 'alerts' | 'unknown';
type CountersPerSchema = Record<SchemaKey, { total: number; failures: number }>;
const initPerSchema = (): CountersPerSchema => ({ overview: { total: 0, failures: 0 }, breakdown: { total: 0, failures: 0 }, alerts: { total: 0, failures: 0 }, unknown: { total: 0, failures: 0 } });

const counters = {
  total: 0,
  failures: 0,
  perSchema: initPerSchema(),
  lastUpdatedTs: 0,
};

function calcFailureRate(n: number, d: number): number {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 1000; // 0..1 with 3 decimals
}

function devEnv(): boolean {
  return __DEV;
}

function isNode(): boolean {
  try {
    const g: any = globalThis as any;
    return !!g?.process?.versions?.node;
  } catch { return false; }
}

function snapshotMetrics() {
  const perSchema = counters.perSchema;
  const by: Record<SchemaKey, { total: number; failures: number; failureRate: number }> = {
    overview: { total: perSchema.overview.total, failures: perSchema.overview.failures, failureRate: calcFailureRate(perSchema.overview.failures, perSchema.overview.total) },
    breakdown: { total: perSchema.breakdown.total, failures: perSchema.breakdown.failures, failureRate: calcFailureRate(perSchema.breakdown.failures, perSchema.breakdown.total) },
    alerts: { total: perSchema.alerts.total, failures: perSchema.alerts.failures, failureRate: calcFailureRate(perSchema.alerts.failures, perSchema.alerts.total) },
    unknown: { total: perSchema.unknown.total, failures: perSchema.unknown.failures, failureRate: calcFailureRate(perSchema.unknown.failures, perSchema.unknown.total) },
  };
  const total = counters.total;
  const failures = counters.failures;
  return {
    total,
    failures,
    failureRate: calcFailureRate(failures, total),
    by,
    lastUpdatedTs: counters.lastUpdatedTs,
  };
}

// Persist metrics for diagnose (opt-in). Guarded to Node + explicit env var to avoid browser bundles.
function maybePersistMetrics() {
  if (!devEnv() || !isNode()) return;
  try {
    const env: any = (globalThis as any).process?.env || {};
    const enabled = env.COSTSCOPE_DEV_METRICS === 'true' || typeof env.COSTSCOPE_DEV_METRICS_FILE === 'string';
    if (!enabled) return;
    // Defer to async dynamic imports to avoid bundling Node builtins in browser builds
    (async () => {
      try {
        // Use generic module ids so bundlers can alias/fallback in browser builds
        const pathMod = await import('path');
        const fsMod = await import('fs');
        const cwd = (globalThis as any).process?.cwd?.() || '.';
        const p = env.COSTSCOPE_DEV_METRICS_FILE || pathMod.join(cwd, 'temp', 'validation-metrics.json');
        const dir = pathMod.dirname(p);
        try { fsMod.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
        const payload = { generatedAt: new Date().toISOString(), metrics: snapshotMetrics() };
        fsMod.writeFileSync(p, JSON.stringify(payload, null, 2), 'utf8');
      } catch { /* ignore */ }
    })();
  } catch { /* ignore */ }
}

export function recordValidationEvent(r: Omit<ValidationEventRecord, 'ts'>) {
  if (!devEnv()) return;
  const ts = Date.now();
  validationRecords.push({ ...r, ts });
  // Update counters
  try {
    counters.total += 1;
    const k = (r.schema || 'unknown') as SchemaKey;
    counters.perSchema[k].total += 1;
    if (!r.success) {
      counters.failures += 1;
      counters.perSchema[k].failures += 1;
    }
    counters.lastUpdatedTs = ts;
    // Expose a shallow snapshot on global for quick dev inspection (no persistence implied)
    try { (globalThis as any).__COSTSCOPE_VALIDATION_METRICS = snapshotMetrics(); } catch { /* ignore */ }
    maybePersistMetrics();
  } catch { /* ignore */ }
  try {
    if ((globalThis as any).__COSTSCOPE_DEBUG_VALIDATION && validationRecords.length % 25 === 0) {
      printValidationSummary();
    }
  } catch { /* noop */ }
}

export function getValidationRecords(): ValidationEventRecord[] {
  if (!devEnv()) return [];
  return validationRecords.slice();
}

export function clearValidationRecords() {
  if (!devEnv()) return;
  validationRecords.length = 0;
  // Reset counters
  const p = initPerSchema();
  (counters.total = 0), (counters.failures = 0), (counters.perSchema = p), (counters.lastUpdatedTs = 0);
}

export interface ValidationAggregateRow {
  schema: string;
  countSuccess: number;
  countError: number;
  avgMs: number; // average duration for successes only
  p95Ms?: number; // optional P95 for successes (simple percentile)
}

function aggregate(): ValidationAggregateRow[] {
  const map: Record<string, { okDurations: number[]; success: number; error: number }> = {};
  for (const r of validationRecords) {
    const key = r.schema;
    if (!map[key]) map[key] = { okDurations: [], success: 0, error: 0 };
    if (r.success) {
      map[key].success += 1;
      map[key].okDurations.push(r.durationMs);
    } else {
      map[key].error += 1;
    }
  }
  return Object.entries(map).map(([schema, v]) => {
    const avgMs = v.okDurations.length
      ? Math.round((v.okDurations.reduce((a, b) => a + b, 0) / v.okDurations.length) * 10) / 10
      : 0;
    const sorted = v.okDurations.slice().sort((a, b) => a - b);
    const p95Idx = sorted.length ? Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95)) : 0;
    return {
      schema,
      countSuccess: v.success,
      countError: v.error,
      avgMs,
      p95Ms: sorted.length ? Math.round(sorted[p95Idx] * 10) / 10 : undefined,
    };
  });
}

export function printValidationSummary() {
  if (!__DEV) return;
  if (!(globalThis as any).__COSTSCOPE_DEBUG_VALIDATION) return; // explicit opt-in
  const rows = aggregate();
  if (!rows.length) { info('[Costscope Validation] no events recorded'); return; }
  try {
    if (__DEV) {
  if (typeof table === 'function') table(rows);
    }
  } catch {
    // Fallback plain log.
    if (__DEV) {
  if (typeof log === 'function') log('[Costscope Validation]', rows);
  info('[Costscope Validation]', rows);
    }
  }
}

// Dev-only helper to retrieve counters programmatically (e.g., tests).
export function getValidationMetrics() {
  if (!__DEV) return { total: 0, failures: 0, failureRate: 0, by: initPerSchema(), lastUpdatedTs: 0 } as any;
  return snapshotMetrics();
}

// Dev global helper attachment (optional convenience): window.costscopePrintValidationSummary()
// Auto-attaches the function to window for invocation without import/require in dev.
declare global {
  // Augment window in browsers; no need to reference the name elsewhere so underscore suppresses unused var
  interface Window {
    costscopePrintValidationSummary?: () => void;
  }
}

try {
  const g: any = globalThis as any;
  if (__DEV && typeof g === 'object' && g) {
    if (!g.costscopePrintValidationSummary) {
      g.costscopePrintValidationSummary = printValidationSummary;
    }
  }
} catch { /* noop */ }
