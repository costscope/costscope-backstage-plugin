export interface RetryAttemptRecord {
    path: string;
    attempts: number;
    success: boolean;
    status?: number;
    code?: string;
    /** Total wall clock duration in ms across all attempts (first attempt start -> final success/failure). */
    durationMs?: number;
    /** For overview endpoint only: number of data points (array length) returned. */
    overviewLength?: number;
    /** Approx uncompressed JSON payload size in bytes (best-effort). */
    responseBytes?: number;
    /** If top-level JSON is an array: its length (generic, not just overview). */
    itemCount?: number;
    ts: number;
}
export interface CacheRecord {
    path: string;
    kind: 'hit' | 'miss' | 'refresh-bypass' | 'stale-ignored' | 'stale-serve' | 'swr-revalidate-start' | 'swr-revalidate-success' | 'swr-revalidate-error' | 'swr-hard-expired';
    ts: number;
}
/** @public */
export type CacheEvent = {
    type: 'stale-serve';
    path: string;
    ts: number;
} | {
    type: 'swr-revalidate-start';
    path: string;
    ts: number;
} | {
    type: 'swr-revalidate-success';
    path: string;
    ts: number;
} | {
    type: 'swr-revalidate-error';
    path: string;
    ts: number;
    error: any;
} | {
    type: 'swr-hard-expired';
    path: string;
    ts: number;
};
export declare function recordRetryAttempt(r: Omit<RetryAttemptRecord, 'ts'>): void;
export declare function getRetryAttemptRecords(): RetryAttemptRecord[];
export declare function recordCacheEvent(r: Omit<CacheRecord, 'ts'>): void;
export declare function getCacheRecords(): CacheRecord[];
export declare function clearCacheRecords(): void;
export declare function clearRetryAttemptRecords(): void;
