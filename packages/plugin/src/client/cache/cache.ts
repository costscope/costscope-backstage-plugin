import type { CacheEvent } from '../telemetry/retryTelemetry';
import { getCacheRecords } from '../telemetry/retryTelemetry';
import { recordCacheEvent } from '../telemetry/telemetry';

import { maybeServeStale, SwrState } from './swrCache';

export interface SwrCfg { enabled: boolean; staleFactor: number }

export class InternalCache {
  private cache = new Map<string, SwrState<any>>();
  private listeners = new Set<(_e: CacheEvent) => void>();
  private controllers = new Map<string, AbortController>();
  constructor(
    private fetcher: (_path: string, _opts?: { correlationId?: string }) => Promise<any>,
    private cfg: () => { cacheTtlMs: number; swr: SwrCfg; maxEntries?: number },
    private enabled: () => boolean,
  ) {}
  subscribe(listener: (_e: CacheEvent) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private emit(e: CacheEvent) { for (const l of this.listeners) { try { l(e); } catch { /* listener error ignored intentionally */ } } }
  invalidate(key?: string) { if (!key) this.cache.clear(); else this.cache.delete(key); }
  registerController(path: string, c: AbortController) { this.controllers.set(path, c); }
  /**
   * Returns aggregated cache telemetry stats (dev-only; empty counts in production).
   * keys: current number of entries in the internal map (including in-flight fetch promises)
   * hits / misses: counts of cache event kinds 'hit' / 'miss'
   * staleServes: number of times a stale value was served under SWR policy
   * revalidateSuccess / revalidateError: background SWR revalidation outcomes
   */
  getCacheStats(): { keys: number; hits: number; misses: number; staleServes: number; revalidateSuccess: number; revalidateError: number } {
    const records = getCacheRecords();
    let hits = 0, misses = 0, staleServes = 0, revalidateSuccess = 0, revalidateError = 0;
    for (const r of records) {
      switch (r.kind) {
        case 'hit': hits += 1; break;
        case 'miss': misses += 1; break;
        case 'stale-serve': staleServes += 1; break;
        case 'swr-revalidate-success': revalidateSuccess += 1; break;
        case 'swr-revalidate-error': revalidateError += 1; break;
        default: break; // ignore other kinds
      }
    }
    return { keys: this.cache.size, hits, misses, staleServes, revalidateSuccess, revalidateError };
  }
  async get<T>(path: string, options?: { refresh?: boolean; correlationId?: string }): Promise<T> {
    if (!this.enabled()) return this.fetcher(path, { correlationId: options?.correlationId });
    const { cacheTtlMs, swr, maxEntries } = this.cfg();
    const key = path; const now = Date.now();
    const existing = this.cache.get(key);
    if (options?.refresh && existing) { try { this.controllers.get(key)?.abort(); } catch { /* abort ignore intentionally */ } }
    if (!options?.refresh && existing && existing.value !== undefined && existing.expires > now) {
      // LRU touch (promote to most recently used)
      this.cache.delete(key); this.cache.set(key, existing);
      recordCacheEvent({ path: key, kind: 'hit' }); return existing.value as T;
    }
    if (!options?.refresh && existing && existing.promise && existing.value === undefined) {
      this.cache.delete(key); this.cache.set(key, existing); // touch while in-flight
      recordCacheEvent({ path: key, kind: 'hit' }); return existing.promise as Promise<T>; }
    if (!options?.refresh && existing) {
      const served = maybeServeStale(existing, key, now, cacheTtlMs, swr as any, () => {
        existing.revalidatePromise = this.fetcher(path, { correlationId: options?.correlationId })
          .then(v => { existing.value = v; const refreshedAt = Date.now(); existing.expires = refreshedAt + cacheTtlMs; existing.hardExpires = refreshedAt + cacheTtlMs * (swr as any).staleFactor; existing.revalidatePromise = undefined; recordCacheEvent({ path: key, kind: 'swr-revalidate-success' }); this.emit({ type: 'swr-revalidate-success', path: key, ts: Date.now() }); return v; })
          .catch(e => { existing.revalidatePromise = undefined; recordCacheEvent({ path: key, kind: 'swr-revalidate-error' }); this.emit({ type: 'swr-revalidate-error', path: key, ts: Date.now(), error: e }); return existing.value; });
        recordCacheEvent({ path: key, kind: 'swr-revalidate-start' }); this.emit({ type: 'swr-revalidate-start', path: key, ts: Date.now() });
      }, ev => this.emit(ev as any));
      if (served !== undefined) return served as T;
    }
    if (options?.refresh && existing) recordCacheEvent({ path: key, kind: 'refresh-bypass' }); else recordCacheEvent({ path: key, kind: 'miss' });
    const entry: SwrState<T> = { expires: now + cacheTtlMs, startedAt: now };
    const promise = this.fetcher(path, { correlationId: options?.correlationId })
      .then(v => { const current = this.cache.get(key); if (current === entry) { entry.value = v; if (swr.enabled) entry.hardExpires = Date.now() + cacheTtlMs * (swr as any).staleFactor; } else if (!current || (current as any).startedAt > entry.startedAt) { recordCacheEvent({ path: key, kind: 'stale-ignored' }); } return v; })
      .catch(e => { if (this.cache.get(key) === entry) this.cache.delete(key); throw e; })
      .finally(() => { this.controllers.delete(key); });
    entry.promise = promise; this.cache.set(key, entry);
    // Enforce LRU capacity: evict least recently used while over limit.
    if (maxEntries && maxEntries > 0 && this.cache.size > maxEntries) {
      const overflow = this.cache.size - maxEntries;
      for (let i = 0; i < overflow; i++) {
        const oldestKey = this.cache.keys().next().value as string | undefined;
        if (oldestKey === undefined) break;
        if (oldestKey === key) { // avoid immediately evicting the just inserted entry if it's the only one
          continue;
        }
        this.cache.delete(oldestKey);
      }
    }
    return promise as Promise<T>;
  }
}
