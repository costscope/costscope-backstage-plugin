// Retry telemetry (dev-only). Records per-request aggregate of retry attempts.
// The CostscopeClient calls recordRetryAttempt at success/failure. Hook `useRetryTelemetry`
// prints a summary table on unmount (development only).

export interface RetryAttemptRecord {
  path: string;
  attempts: number; // total attempts performed (1 = no retry)
  success: boolean;
  status?: number; // last HTTP status (if any)
  code?: string; // CostscopeError code on failure
  /** Total wall clock duration in ms across all attempts (first attempt start -> final success/failure). */
  durationMs?: number;
  /** For overview endpoint only: number of data points (array length) returned. */
  overviewLength?: number;
  /** Approx uncompressed JSON payload size in bytes (best-effort). */
  responseBytes?: number;
  /** If top-level JSON is an array: its length (generic, not just overview). */
  itemCount?: number;
  ts: number; // timestamp ms
}

export interface CacheRecord {
  path: string;
  kind: 'hit' | 'miss' | 'refresh-bypass' | 'stale-ignored' | 'stale-serve' | 'swr-revalidate-start' | 'swr-revalidate-success' | 'swr-revalidate-error' | 'swr-hard-expired';
  ts: number;
}

// Public emitted cache event stream. Consumers can subscribe via CostscopeClient.subscribeCacheEvents.
/** @public */
export type CacheEvent =
  | { type: 'stale-serve'; path: string; ts: number }
  | { type: 'swr-revalidate-start'; path: string; ts: number }
  | { type: 'swr-revalidate-success'; path: string; ts: number }
  | { type: 'swr-revalidate-error'; path: string; ts: number; error: any }
  | { type: 'swr-hard-expired'; path: string; ts: number };

const records: RetryAttemptRecord[] = [];
const cacheRecords: CacheRecord[] = [];

export function recordRetryAttempt(r: Omit<RetryAttemptRecord, 'ts'>) {
  const env = (globalThis as any)?.process?.env;
  if (env?.NODE_ENV === 'production') return; // no-op prod
  records.push({ ...r, ts: Date.now() });
}

export function getRetryAttemptRecords(): RetryAttemptRecord[] {
  const env = (globalThis as any)?.process?.env;
  if (env?.NODE_ENV === 'production') return [];
  return records.slice();
}

export function recordCacheEvent(r: Omit<CacheRecord, 'ts'>) {
  const env = (globalThis as any)?.process?.env;
  if (env?.NODE_ENV === 'production') return; // no-op prod
  cacheRecords.push({ ...r, ts: Date.now() });
}

export function getCacheRecords(): CacheRecord[] {
  const env = (globalThis as any)?.process?.env;
  if (env?.NODE_ENV === 'production') return [];
  return cacheRecords.slice();
}

export function clearCacheRecords() {
  const env = (globalThis as any)?.process?.env;
  if (env?.NODE_ENV === 'production') return;
  cacheRecords.length = 0;
}

export function clearRetryAttemptRecords() {
  const env = (globalThis as any)?.process?.env;
  if (env?.NODE_ENV === 'production') return;
  records.length = 0;
}
