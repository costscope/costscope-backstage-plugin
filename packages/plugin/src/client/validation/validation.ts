/* global process */
import { __DEV } from '../../build-consts';
import { CostscopeErrorCodes } from '../../constants/errors';
import { warn, info } from '../../utils/logger';
import type { ZodAny } from '../../validationTypes';
import { buildError } from '../core/errors';
import { recordValidationEvent } from '../telemetry/telemetry';

let schemas: undefined | { overview: ZodAny; breakdown: ZodAny; alerts: ZodAny };
let schemaHashLogged = false;
let specHashMismatchReported = false;

// Test-only helper (not for production use). When process.env.NODE_ENV==='test',
// this allows resetting internal logging guards so unit tests can assert
// first-load log behavior deterministically. In non-test environments it no-ops.
export function __resetValidationLoggingForTest() {
  const env = (globalThis as any)?.process?.env?.NODE_ENV;
  if (env !== 'test' && env !== 'development' && env !== 'ci') return; // be lenient for CI
  schemaHashLogged = false;
  specHashMismatchReported = false;
  // Cross-module reset: signal any fresh module instance to reset its guards
  try { (globalThis as any).__COSTSCOPE_RESET_VALIDATION_LOGGING__ = true; } catch { /* ignore */ }
}

export function runtimeValidationEnabled(): boolean {
  const env = (globalThis as any)?.process?.env ?? {};
  return env.COSTSCOPE_RUNTIME_VALIDATE === 'true';
}

export function computeSchemaHash(): string {
  const mod: any = (globalThis as any)?.__COSTSCOPE_VD || undefined;
  if (mod && mod.VALIDATION_DESCRIPTOR_HASH) return mod.VALIDATION_DESCRIPTOR_HASH;
  try { import('../../validationDescriptor').then(m => { (globalThis as any).__COSTSCOPE_VD = m; }); } catch { /* ignore */ }
  return (globalThis as any).__COSTSCOPE_VD?.VALIDATION_DESCRIPTOR_HASH || '00000000';
}

export async function ensureSchemas(errorApi?: any, force?: boolean) {
  if (!runtimeValidationEnabled() && !force) return undefined;
  // Honor cross-module reset signal (helps when Jest resets module cache and the test
  // holds an old reference to the reset helper). This ensures fresh instances also reset.
  try {
    if ((globalThis as any).__COSTSCOPE_RESET_VALIDATION_LOGGING__) {
      schemaHashLogged = false;
      specHashMismatchReported = false;
      delete (globalThis as any).__COSTSCOPE_RESET_VALIDATION_LOGGING__;
    }
  } catch { /* ignore */ }
  const firstLoad = !schemas;
  if (firstLoad) {
    const z = await import('zod');
    schemas = {
      overview: z.z.array(z.z.object({ date: z.z.string(), cost: z.z.number() })),
      breakdown: z.z.array(z.z.object({ dim: z.z.string(), cost: z.z.number(), deltaPct: z.z.number() })),
      alerts: z.z.array(z.z.object({ id: z.z.string(), severity: z.z.enum(['info', 'warn', 'critical']), message: z.z.string() })),
    } as any;
  }
  // Logging + drift detection (once per process for hash log; drift warning once)
  try {
    const env = process.env;
    if (__DEV) {
      const hash = computeSchemaHash();
      // Hash info log can be suppressed via env toggle
      if (env?.COSTSCOPE_LOG_VALIDATION_HASH !== 'false' && !schemaHashLogged) {
        schemaHashLogged = true;
        info(`[Costscope Validation] schemaHash=${hash}`);
      }
      // Drift detection should still run even if info log suppressed
  if (!specHashMismatchReported) {
        try {
          const mod: any = await import('@costscope/contracts');
          if (mod?.verifyDescriptorHash) {
            const result = mod.verifyDescriptorHash({ descriptorHash: hash });
            if (!result.matches && !specHashMismatchReported) {
              specHashMismatchReported = true;
              const msg = `[Costscope Validation] WARNING: runtime descriptor hash (${hash}) differs from spec hash fragment (${result.comparedSpecFragment}). Regenerate contracts or update validation descriptor.`;
              // Keep warnings in production so operators see drift, but avoid optional dev info logs here.
              warn(msg);
              const eApi = errorApi || (globalThis as any).__COSTSCOPE_ERROR_API__;
              if (eApi) {
                try { const err = new Error(msg); (err as any).code = 'SPEC_SCHEMA_DRIFT'; eApi.post(err); } catch { /* ignore */ }
              }
            }
          }
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
  return schemas;
}

export async function validateIfEnabled(
  path: string,
  json: unknown,
  attempt: number,
  correlationId: string,
  validateOverride?: boolean,
  errorApi?: any,
): Promise<void> {
  const shouldValidate = typeof validateOverride === 'boolean' ? validateOverride : (process.env.COSTSCOPE_RUNTIME_VALIDATE === 'true');
  if (!shouldValidate) return;
  const started = Date.now();
  let schema: 'overview' | 'breakdown' | 'alerts' | 'unknown' = 'unknown';
  try {
  const s = await ensureSchemas(errorApi, /* force */ true);
    if (s) {
      if (path.startsWith('/costs/daily')) { schema = 'overview'; s.overview.parse(json); }
      else if (path.startsWith('/breakdown')) { schema = 'breakdown'; s.breakdown.parse(json); }
      else if (path.startsWith('/alerts')) { schema = 'alerts'; s.alerts.parse(json); }
    }
    recordValidationEvent({ path, success: true, durationMs: Date.now() - started, schema, schemaHash: computeSchemaHash() });
  } catch (e: any) {
    recordValidationEvent({ path, success: false, durationMs: Date.now() - started, schema, errorMessage: String(e?.message || e), schemaHash: computeSchemaHash() });
    throw buildError({ code: CostscopeErrorCodes.VALIDATION_ERROR, message: `Schema validation failed for ${path}: ${e.message}`, attempt, cause: e, correlationId, path, schemaHash: computeSchemaHash() });
  }
}
