import type { Overview, BreakdownRow, ActionItem, ProviderInfo, DatasetMeta, DatasetSearchRow, DatasetSearchParams, Healthz } from './types';
export { costscopeApiRef } from './apiRef';
export interface CostscopeClientOptions {
    discoveryApi: any;
    fetchApi: any;
    identityApi: any;
    errorApi?: any;
    alertApi?: any;
    serviceId?: string;
    timeoutMs?: number;
    cacheTtlMs?: number;
    maxEntries?: number;
    enableInternalCache?: boolean;
    retry?: {
        maxAttempts?: number;
        retryOn?: number[];
        backoffBaseMs?: number;
        jitterFactor?: number;
    };
    critical?: {
        statuses?: number[];
        codes?: string[];
    };
    silent?: boolean;
    swr?: {
        enabled?: boolean;
        staleFactor?: number;
    };
    telemetry?: (event: any) => void;
    configApi?: any;
}
export declare class CostscopeClient {
    private transportDeps;
    private retryCfg;
    private cache?;
    private largePayloadWarnedPaths;
    private enableInternalCache;
    private cfgValues;
    private unregisterTelemetry?;
    constructor(opts: CostscopeClientOptions);
    private get;
    private uuid;
    getOverview(period: string, options?: {
        refresh?: boolean;
        project?: string;
        signal?: AbortSignal;
        correlationId?: string;
        validate?: boolean;
    }): Promise<any[]>;
    getBreakdown(group: string, period: string, options?: {
        refresh?: boolean;
        project?: string;
        signal?: AbortSignal;
        correlationId?: string;
        validate?: boolean;
    }): Promise<any[]>;
    getActionItems(options?: {
        refresh?: boolean;
        project?: string;
        signal?: AbortSignal;
        correlationId?: string;
        validate?: boolean;
    }): Promise<any[]>;
    getSummary(period: string, options?: {
        refresh?: boolean;
        project?: string;
        signal?: AbortSignal;
        correlationId?: string;
        validate?: boolean;
    }): Promise<any>;
    getProviders(options?: {
        refresh?: boolean;
        signal?: AbortSignal;
        correlationId?: string;
        validate?: boolean;
    }): Promise<ProviderInfo[]>;
    getDatasets(options?: {
        refresh?: boolean;
        project?: string;
        signal?: AbortSignal;
        correlationId?: string;
        validate?: boolean;
    }): Promise<DatasetMeta[]>;
    searchDatasets(params: DatasetSearchParams & {
        refresh?: boolean;
        signal?: AbortSignal;
        correlationId?: string;
        validate?: boolean;
    }): Promise<DatasetSearchRow[]>;
    health(options?: {
        signal?: AbortSignal;
        correlationId?: string;
    }): Promise<Healthz>;
    prefetchAll(params: {
        period?: string;
        project?: string;
        signal?: AbortSignal;
    }): Promise<{
        overview: Overview[];
        breakdown: BreakdownRow[];
        alerts: ActionItem[];
        summary?: any;
        providers?: ProviderInfo[];
        datasets?: DatasetMeta[];
        correlationId: string;
        durationMs: number;
    }>;
    invalidate(path?: string): void;
    /** Backward-compatible alias */
    invalidateCache(key?: string): void;
    subscribeCacheEvents(listener: any): any;
    /** Returns the effective merged runtime configuration (constructor > app-config > defaults). */
    private _cfg;
    /** Test hook: expose config via client['cfg']() */
    ['cfg'](): {
        timeoutMs: number;
        cacheTtlMs: number;
        retry: {
            maxAttempts: number;
            retryOn: number[];
            backoffBaseMs: number;
            jitterFactor?: number | undefined;
        };
        swr: {
            enabled: boolean;
            staleFactor: number;
        };
    };
    /** Test hook: expose internalCacheEnabled via client['internalCacheEnabled']() */
    ['internalCacheEnabled'](): boolean;
    /** Test hook: expose critical classification via client['isCritical'](e) */
    ['isCritical'](e: any): boolean;
}
export type { CostscopeApi, Overview, BreakdownRow, ActionItem, Summary, ProviderInfo, DatasetMeta, DatasetSearchRow, DatasetSearchParams, Healthz } from './types';
export { isCostscopeError } from './core/errors';
export { CostscopeErrorCodes, type CostscopeErrorCode } from '../constants/errors';
export type { CostscopeError } from './core/errors';
