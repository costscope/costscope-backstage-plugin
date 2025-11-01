import type { CacheEvent } from '../telemetry/retryTelemetry';
export interface SwrCfg {
    enabled: boolean;
    staleFactor: number;
}
export declare class InternalCache {
    private fetcher;
    private cfg;
    private enabled;
    private cache;
    private listeners;
    private controllers;
    constructor(fetcher: (path: string, opts?: {
        correlationId?: string;
    }) => Promise<any>, cfg: () => {
        cacheTtlMs: number;
        swr: SwrCfg;
        maxEntries?: number;
    }, enabled: () => boolean);
    subscribe(listener: (e: CacheEvent) => void): () => boolean;
    private emit;
    invalidate(key?: string): void;
    registerController(path: string, c: AbortController): void;
    /**
     * Returns aggregated cache telemetry stats (dev-only; empty counts in production).
     * keys: current number of entries in the internal map (including in-flight fetch promises)
     * hits / misses: counts of cache event kinds 'hit' / 'miss'
     * staleServes: number of times a stale value was served under SWR policy
     * revalidateSuccess / revalidateError: background SWR revalidation outcomes
     */
    getCacheStats(): {
        keys: number;
        hits: number;
        misses: number;
        staleServes: number;
        revalidateSuccess: number;
        revalidateError: number;
    };
    get<T>(path: string, options?: {
        refresh?: boolean;
        correlationId?: string;
    }): Promise<T>;
}
