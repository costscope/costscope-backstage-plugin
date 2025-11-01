import { z } from 'zod';
// Use extensionless import so Jest/ts-node resolves the TS source; TypeScript will append .js in emitted output
// NOTE: NodeNext requires explicit extension; we keep '.js' here.
// A shim file 'finops-zod.js' re-exports the TS module for test environments.
import { schemas } from './generated/finops-zod.js';

// Generic helper to validate arbitrary data against a zod schema.
export function validateWith<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

// Safe variant that returns success boolean + data or error.
export function safeValidateWith<T>(schema: z.ZodType<T>, data: unknown): { ok: true; data: T } | { ok: false; error: z.ZodError } {
  try {
    const parsed = schema.parse(data);
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: e as z.ZodError };
  }
}

// Specific convenience validators for common endpoints.
export const validateProviders = (data: unknown) => validateWith(z.array(schemas.Provider), data);
export const validateDatasets = (data: unknown) => validateWith(z.array(schemas.Dataset), data);
export const validateCostDaily = (data: unknown) => validateWith(z.array(schemas.OverviewItem), data);
export const validateCostSummary = (data: unknown) => validateWith(schemas.CostSummary, data);
export const validateBreakdown = (data: unknown) => validateWith(z.array(schemas.BreakdownRow), data);
export const validateAlerts = (data: unknown) => validateWith(z.array(schemas.ActionItem), data);

// Drift utility: Compare a provided descriptor hash with current OpenAPI spec hash (prefix match optional).
// We purposely don't enforce equality because descriptor hash is a different algorithm; ensure caller implements appropriate logic.
export function verifyDescriptorHash(opts: {
  descriptorHash: string; // e.g. VALIDATION_DESCRIPTOR_HASH
  specHash?: string; // optionally override (defaults to exported OPENAPI_SPEC_HASH)
  prefixLength?: number; // compare only first N chars of spec hash (default 12) when using heuristic matching
}): { matches: boolean; specHash: string; descriptorHash: string; comparedSpecFragment: string } {
  // Lazy import to avoid circular if consumer imported verifyDescriptorHash before generated file ready.
  // (In practice this shouldn't happen, but stays defensive.)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { OPENAPI_SPEC_HASH } = require('./generated/finops-api');
  const specHashFull = opts.specHash ?? OPENAPI_SPEC_HASH;
  const prefixLength = opts.prefixLength ?? 12;
  const fragment = specHashFull.slice(0, prefixLength);
  // Simple match rule: descriptor hash equals fragment OR full hash (covers future alignment changes).
  const matches = opts.descriptorHash === fragment || opts.descriptorHash === specHashFull;
  return {
    matches,
    specHash: specHashFull,
    descriptorHash: opts.descriptorHash,
    comparedSpecFragment: fragment,
  };
}
