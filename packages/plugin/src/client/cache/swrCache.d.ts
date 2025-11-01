import type { CacheEvent } from '../telemetry/retryTelemetry';
export interface SwrState<T> {
    value?: T;
    expires: number;
    hardExpires?: number;
    promise?: Promise<T>;
    revalidatePromise?: Promise<T>;
    startedAt: number;
}
export interface SwrConfig {
    enabled: boolean;
    staleFactor: number;
}
export declare function maybeServeStale<T>(entry: SwrState<T>, key: string, now: number, cacheTtlMs: number, swr: SwrConfig, trigger: () => void, emit: (e: CacheEvent) => void): T | undefined;
