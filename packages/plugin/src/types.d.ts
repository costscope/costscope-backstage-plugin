/** Daily cost time-series item. */
export type Overview = (import('@costscope/contracts').paths['/costs/daily'] extends {
    get: {
        responses: {
            200: {
                content: {
                    'application/json': infer R;
                };
            };
        };
    };
} ? R : unknown) extends Array<infer O> ? O : {
    date: string;
    cost: number;
};
/** Breakdown row for the selected dimension. */
export type BreakdownRow = (import('@costscope/contracts').paths['/breakdown'] extends {
    get: {
        responses: {
            200: {
                content: {
                    'application/json': infer R;
                };
            };
        };
    };
} ? R : unknown) extends Array<infer B> ? B : {
    dim: string;
    cost: number;
    deltaPct: number;
};
/** Action item / alert returned by backend. */
export type ActionItem = (import('@costscope/contracts').paths['/alerts'] extends {
    get: {
        responses: {
            200: {
                content: {
                    'application/json': infer R;
                };
            };
        };
    };
} ? R : unknown) extends Array<infer A> ? A : {
    id: string;
    severity: 'info' | 'warn' | 'critical';
    message: string;
};
/** Aggregated summary for the selected period. */
export type Summary = import('@costscope/contracts').paths['/costs/summary'] extends {
    get: {
        responses: {
            200: {
                content: {
                    'application/json': infer R;
                };
            };
        };
    };
} ? R : unknown;
/** Provider metadata list item. */
type __ContractsPaths = import('@costscope/contracts').paths & Record<string, any>;
export type ProviderInfo = (__ContractsPaths['/providers'] extends {
    get: {
        responses: {
            200: {
                content: {
                    'application/json': infer R;
                };
            };
        };
    };
} ? R : unknown) extends Array<infer P> ? P : {
    id: string;
    name: string;
    status?: string;
};
/** Dataset metadata (short list form). */
export type DatasetMeta = (import('@costscope/contracts').paths['/datasets'] extends {
    get: {
        responses: {
            200: {
                content: {
                    'application/json': infer R;
                };
            };
        };
    };
} ? R : unknown) extends Array<infer D> ? D : {
    id: string;
    provider: string;
    periodStart: string;
    periodEnd: string;
    records: number;
    status: string;
};
/** Dataset search result row (same shape as /datasets). */
export type DatasetSearchRow = (__ContractsPaths['/datasets/search'] extends {
    get: {
        responses: {
            200: {
                content: {
                    'application/json': infer R;
                };
            };
        };
    };
} ? R : unknown) extends Array<infer S> ? S : DatasetMeta;
/** Health response. */
export type Healthz = __ContractsPaths['/healthz'] extends {
    get: {
        responses: {
            200: {
                content: {
                    'application/json': infer R;
                };
            };
        };
    };
} ? R : {
    status: string;
};
export interface DatasetSearchParams {
    project?: string;
    provider?: string;
    status?: string;
    from?: string;
    to?: string;
    minRecords?: number;
    maxRecords?: number;
    limit?: number;
}
/** Client contract used by UI components. */
export interface CostscopeApi {
    getOverview(period: string, options?: {
        refresh?: boolean;
        project?: string;
        signal?: AbortSignal;
        validate?: boolean;
    }): Promise<Overview[]>;
    getBreakdown(group: string, period: string, options?: {
        refresh?: boolean;
        project?: string;
        signal?: AbortSignal;
        validate?: boolean;
    }): Promise<BreakdownRow[]>;
    getActionItems(options?: {
        refresh?: boolean;
        project?: string;
        signal?: AbortSignal;
        validate?: boolean;
    }): Promise<ActionItem[]>;
    prefetchAll(params: {
        period?: string;
        project?: string;
        signal?: AbortSignal;
        validate?: boolean;
    }): Promise<{
        overview: Overview[];
        breakdown: BreakdownRow[];
        alerts: ActionItem[];
        summary?: Summary;
        providers?: ProviderInfo[];
        datasets?: DatasetMeta[];
        correlationId: string;
        durationMs: number;
    }>;
    invalidateCache(key?: string): void;
    subscribeCacheEvents?(listener: (e: import('./client/telemetry/retryTelemetry').CacheEvent) => void): () => void;
    getSummary(period: string, options?: {
        refresh?: boolean;
        project?: string;
        signal?: AbortSignal;
        validate?: boolean;
    }): Promise<Summary>;
    getProviders(options?: {
        refresh?: boolean;
        signal?: AbortSignal;
        validate?: boolean;
    }): Promise<ProviderInfo[]>;
    getDatasets(options?: {
        refresh?: boolean;
        project?: string;
        signal?: AbortSignal;
        validate?: boolean;
    }): Promise<DatasetMeta[]>;
    searchDatasets(params: DatasetSearchParams & {
        signal?: AbortSignal;
        refresh?: boolean;
        validate?: boolean;
    }): Promise<DatasetSearchRow[]>;
    health(options?: {
        signal?: AbortSignal;
    }): Promise<Healthz>;
}
export {};
