// Public contract types derived from @costscope/contracts
// Public surface types.

// Re-exportable alias for the OpenAPI paths from @costscope/contracts that backs our public types.
// Exposing this alias ensures API Extractor recognizes the referenced symbol as part of the entrypoint surface.
// Use inline imports in exported types to avoid leaking local aliases into the API surface

/**
 * Daily cost time-series item.
 * @public
 */
export type Overview =
  (
    import('@costscope/contracts').paths['/costs/daily'] extends {
      get: { responses: { 200: { content: { 'application/json': infer R } } } };
    }
      ? R
      : unknown
  ) extends Array<infer O>
    ? O
    : { date: string; cost: number };

/**
 * Breakdown row for the selected dimension.
 * @public
 */
export type BreakdownRow =
  (
    import('@costscope/contracts').paths['/breakdown'] extends {
      get: { responses: { 200: { content: { 'application/json': infer R } } } };
    }
      ? R
      : unknown
  ) extends Array<infer B>
    ? B
    : { dim: string; cost: number; deltaPct: number };

/**
 * Action item / alert returned by backend.
 * @public
 */
export type ActionItem =
  (
    import('@costscope/contracts').paths['/alerts'] extends {
      get: { responses: { 200: { content: { 'application/json': infer R } } } };
    }
      ? R
      : unknown
  ) extends Array<infer A>
    ? A
    : { id: string; severity: 'info' | 'warn' | 'critical'; message: string };

/**
 * Aggregated summary for the selected period.
 * @public
 */
export type Summary = import('@costscope/contracts').paths['/costs/summary'] extends {
  get: { responses: { 200: { content: { 'application/json': infer R } } } };
}
  ? R
  : unknown;

/**
 * Provider metadata list item.
 * @public
 */
export type ProviderInfo =
  (
    import('@costscope/contracts').paths['/providers'] extends {
      get: { responses: { 200: { content: { 'application/json': infer R } } } };
    }
      ? R
      : unknown
  ) extends Array<infer P>
    ? P
    : { id: string; name: string; status?: string };

/**
 * Dataset metadata (short list form).
 * @public
 */
export type DatasetMeta =
  (
    import('@costscope/contracts').paths['/datasets'] extends {
      get: { responses: { 200: { content: { 'application/json': infer R } } } };
    }
      ? R
      : unknown
  ) extends Array<infer D>
    ? D
    : {
        id: string;
        provider: string;
        periodStart: string;
        periodEnd: string;
        records: number;
        status: string;
      };

/**
 * Dataset search result row (same shape as /datasets).
 * @public
 */
export type DatasetSearchRow =
  (
    (import('@costscope/contracts').paths & Record<string, any>)['/datasets/search'] extends {
      get: { responses: { 200: { content: { 'application/json': infer R } } } };
    }
      ? R
      : unknown
  ) extends Array<infer S>
    ? S
    : DatasetMeta;

/**
 * Health response.
 * @public
 */
export type Healthz = (import('@costscope/contracts').paths &
  Record<string, any>)['/healthz'] extends {
  get: { responses: { 200: { content: { 'application/json': infer R } } } };
}
  ? R
  : { status: string };

/**
 * Parameters for datasets search.
 * @public
 */
export interface DatasetSearchParams {
  project?: string;
  provider?: string; // comma list
  status?: string;
  from?: string;
  to?: string;
  minRecords?: number;
  maxRecords?: number;
  limit?: number;
}

/** Client contract used by UI components.
 * @public
 */
export interface CostscopeApi {
  getOverview(
    period: string,
    options?: { refresh?: boolean; project?: string; signal?: AbortSignal; validate?: boolean },
  ): Promise<Overview[]>;
  getBreakdown(
    group: string,
    period: string,
    options?: { refresh?: boolean; project?: string; signal?: AbortSignal; validate?: boolean },
  ): Promise<BreakdownRow[]>;
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
  subscribeCacheEvents?(
    listener: (e: import('./client/telemetry/retryTelemetry').CacheEvent) => void,
  ): () => void;
  getSummary(
    period: string,
    options?: { refresh?: boolean; project?: string; signal?: AbortSignal; validate?: boolean },
  ): Promise<Summary>;
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
  searchDatasets(
    params: DatasetSearchParams & { signal?: AbortSignal; refresh?: boolean; validate?: boolean },
  ): Promise<DatasetSearchRow[]>;
  health(options?: { signal?: AbortSignal }): Promise<Healthz>;
}
