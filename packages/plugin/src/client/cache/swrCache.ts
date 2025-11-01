import type { CacheEvent } from '../telemetry/retryTelemetry';
import { recordCacheEvent } from '../telemetry/telemetry';

export interface SwrState<T> { value?: T; expires: number; hardExpires?: number; promise?: Promise<T>; revalidatePromise?: Promise<T>; startedAt: number; }
export interface SwrConfig { enabled: boolean; staleFactor: number; }

// Serve stale value under SWR policy; trigger background revalidation when within stale window.
export function maybeServeStale<T>(entry: SwrState<T>, key: string, now: number, cacheTtlMs: number, swr: SwrConfig, trigger: () => void, emit: (e: CacheEvent) => void): T | undefined {
  if (!swr.enabled) return undefined;
  if (entry.value === undefined) return undefined;
  if (entry.expires > now) return undefined;
  const createdAt = entry.expires - cacheTtlMs;
  const hardExpires = createdAt + cacheTtlMs * swr.staleFactor;
  entry.hardExpires = hardExpires;
  if (now < hardExpires) {
  // Capture a stable snapshot of the stale value before triggering background revalidation.
  // This avoids edge cases where an extremely fast revalidation resolves and mutates
  // entry.value before we return, causing the caller to observe the refreshed value
  // instead of the intended stale one.
  const staleValue = entry.value;
  recordCacheEvent({ path: key, kind: 'stale-serve' });
  emit({ type: 'stale-serve', path: key, ts: Date.now() });
  if (!entry.revalidatePromise) trigger();
  return staleValue;
  }
  recordCacheEvent({ path: key, kind: 'swr-hard-expired' });
  emit({ type: 'swr-hard-expired', path: key, ts: Date.now() });
  return undefined;
}
