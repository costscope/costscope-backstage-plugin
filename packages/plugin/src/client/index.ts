import { resolveRuntimeConfig } from '../config/runtimeConfig';
import { DEFAULT_SERVICE_ID } from '../constants';
import { buildPath } from '../utils/path';
import { withProjectParam } from '../utils/project';

import { InternalCache } from './cache';
import { isCritical as _isCritical } from './core/errors';
import { httpGet, type TransportDeps, type RetryConfig } from './core/transport';
import { registerTelemetryListener } from './telemetry/telemetry';
import type {
  Overview,
  BreakdownRow,
  ActionItem,
  ProviderInfo,
  DatasetMeta,
  DatasetSearchRow,
  DatasetSearchParams,
  Healthz,
} from './types';
export { costscopeApiRef } from './apiRef';

/** @public */
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
  critical?: { statuses?: number[]; codes?: string[] };
  silent?: boolean;
  swr?: { enabled?: boolean; staleFactor?: number };
  telemetry?: (_event: any) => void;
  configApi?: any;
}

/** @public */
export class CostscopeClient {
  private transportDeps: TransportDeps;
  private retryCfg: RetryConfig;
  private cache?: InternalCache;
  private largePayloadWarnedPaths = new Set<string>();
  private enableInternalCache: boolean;
  private cfgValues: {
    cacheTtlMs: number;
    maxEntries?: number;
    swr: { enabled: boolean; staleFactor: number };
  };
  private unregisterTelemetry?: () => void;
  private useVersionedAnalytics: boolean;

  constructor(opts: CostscopeClientOptions) {
    const { discoveryApi, fetchApi, identityApi, errorApi, alertApi } = opts;
    const rc = resolveRuntimeConfig({ options: opts });
    const serviceId = rc.serviceId || DEFAULT_SERVICE_ID;
    this.transportDeps = {
      discoveryApi,
      fetchApi,
      identityApi,
      errorApi,
      alertApi,
      serviceId,
      silent: rc.silent,
      critical: rc.critical,
      largePayloadWarnedPaths: this.largePayloadWarnedPaths,
    } as any;
    this.retryCfg = {
      timeoutMs: rc.timeoutMs,
      retry: {
        maxAttempts: rc.retry.maxAttempts,
        retryOn: rc.retry.retryOn,
        backoffBaseMs: rc.retry.backoffBaseMs,
        jitterFactor: rc.retry.jitterFactor,
      },
    };
    this.cfgValues = { cacheTtlMs: rc.cacheTtlMs, maxEntries: rc.maxEntries, swr: rc.swr };
    this.enableInternalCache = rc.enableInternalCache;
    // Feature toggle: prefer versioned analytics endpoints when enabled.
    // Sources (precedence): constructor option experimental.useVersionedAnalytics > app-config > env var > default false
    let uva = false;
    try {
      const cfg = (opts as any).configApi;
      const fromCfg = cfg?.getOptionalBoolean?.('costscope.client.useVersionedAnalytics');
      uva = Boolean(
        (opts as any)?.experimental?.useVersionedAnalytics ??
          fromCfg ??
          (process as any)?.env?.COSTSCOPE_USE_VERSIONED_ANALYTICS === 'true',
      );
    } catch {
      uva = Boolean((opts as any)?.experimental?.useVersionedAnalytics);
    }
    this.useVersionedAnalytics = uva;
    // Minimal test-only introspection surface (used by a few unit tests). Not documented/public.
    (this as any).impl = { transportDeps: this.transportDeps };
    // Wire external telemetry callback if provided
    try {
      if (typeof (opts as any).telemetry === 'function') {
        this.unregisterTelemetry = registerTelemetryListener((opts as any).telemetry);
        // Mark as used to satisfy TS unused property checks
        void this.unregisterTelemetry;
      }
    } catch {
      /* ignore */
    }
    if (this.enableInternalCache) {
      // Provide registerController callback so refresh abort logic works.
      let cacheRef: InternalCache | undefined;
      const fetcher = (path: string, o?: { correlationId?: string }) =>
        httpGet<any>(
          path,
          this.retryCfg,
          this.transportDeps,
          o?.correlationId || this.uuid(),
          (p, c) => cacheRef?.registerController(p, c),
        );
      const cfgFn = () => ({
        cacheTtlMs: this.cfgValues.cacheTtlMs,
        swr: this.cfgValues.swr,
        maxEntries: this.cfgValues.maxEntries,
      });
      const enabledFn = () => true; // respects enableInternalCache flag already
      this.cache = new InternalCache(fetcher, cfgFn, enabledFn);
      cacheRef = this.cache;
    }
  }

  private async get<T>(
    path: string,
    options?: {
      refresh?: boolean;
      signal?: AbortSignal;
      correlationId?: string;
      validate?: boolean;
    },
  ): Promise<T> {
    const correlationId = options?.correlationId || this.uuid();
    if (options?.signal) {
      // Bypass internal cache when external cancellation is provided to avoid retaining controllers.
      return httpGet<T>(
        path,
        this.retryCfg,
        this.transportDeps,
        correlationId,
        undefined,
        options.signal,
        { validate: options?.validate },
      );
    }
    // If a per-request validation override is provided, bypass internal cache to ensure
    // the correct validation policy is applied to this fetch (and avoid serving prior entries).
    if (this.cache && typeof options?.validate !== 'boolean') {
      return this.cache.get<T>(path, { refresh: options?.refresh, correlationId });
    }
    return httpGet<T>(
      path,
      this.retryCfg,
      this.transportDeps,
      correlationId,
      undefined,
      undefined,
      { validate: options?.validate },
    );
  }

  private uuid(): string {
    try {
      const g: any = globalThis;
      if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
    } catch {
      /* ignore */
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // Public API (backward compatible signatures)
  async getOverview(
    period: string,
    options?: {
      refresh?: boolean;
      project?: string;
      signal?: AbortSignal;
      correlationId?: string;
      validate?: boolean;
    },
  ): Promise<any[]> {
    // Use versioned analytics trends endpoint; default to day granularity for overview time series
    const path = this.useVersionedAnalytics
      ? buildPath(
          '/api/v1/analytics/trends',
          withProjectParam({ period, granularity: 'day' }, options?.project),
        )
      : buildPath('/costs/daily', withProjectParam({ period }, options?.project));
    const data: any = await this.get(path, {
      refresh: options?.refresh,
      signal: options?.signal,
      correlationId: options?.correlationId,
      validate: options?.validate,
    });
    // Tolerate envelope: { trends: [...], granularity }
    if (Array.isArray(data)) return data as any[];
    if (data && Array.isArray((data as any).trends)) return (data as any).trends as any[];
    if (data && data.data && Array.isArray((data as any).data.trends))
      return (data as any).data.trends as any[];
    return data as any[];
  }
  async getBreakdown(
    group: string,
    period: string,
    options?: {
      refresh?: boolean;
      project?: string;
      signal?: AbortSignal;
      correlationId?: string;
      validate?: boolean;
    },
  ): Promise<any[]> {
    // Use versioned analytics top-services endpoint; pass through grouping hint for future extensibility
    const path = this.useVersionedAnalytics
      ? buildPath(
          '/api/v1/analytics/top-services',
          withProjectParam({ by: group, period }, options?.project),
        )
      : buildPath('/breakdown', withProjectParam({ by: group, period }, options?.project));
    const data: any = await this.get(path, {
      refresh: options?.refresh,
      signal: options?.signal,
      correlationId: options?.correlationId,
      validate: options?.validate,
    });
    // Tolerate envelope: { top_services: [...] }
    if (Array.isArray(data)) return data as any[];
    if (data && Array.isArray((data as any).top_services))
      return (data as any).top_services as any[];
    if (data && data.data && Array.isArray((data as any).data.top_services))
      return (data as any).data.top_services as any[];
    return data as any[];
  }
  async getActionItems(options?: {
    refresh?: boolean;
    project?: string;
    signal?: AbortSignal;
    correlationId?: string;
    validate?: boolean;
  }): Promise<any[]> {
    const path = buildPath('/alerts', withProjectParam({}, options?.project));
    return this.get(path, {
      refresh: options?.refresh,
      signal: options?.signal,
      correlationId: options?.correlationId,
      validate: options?.validate,
    });
  }
  async getSummary(
    period: string,
    options?: {
      refresh?: boolean;
      project?: string;
      signal?: AbortSignal;
      correlationId?: string;
      validate?: boolean;
    },
  ): Promise<any> {
    const path = this.useVersionedAnalytics
      ? buildPath('/api/v1/analytics/summary', withProjectParam({ period }, options?.project))
      : buildPath('/costs/summary', withProjectParam({ period }, options?.project));
    const data: any = await this.get(path, {
      refresh: options?.refresh,
      signal: options?.signal,
      correlationId: options?.correlationId,
      validate: options?.validate,
    });
    // Tolerate envelope: { summary: {...} }
    if (data && (data as any).summary) return (data as any).summary;
    if (data && (data as any).data && (data as any).data.summary) return (data as any).data.summary;
    return data as any;
  }

  async getProviders(options?: {
    refresh?: boolean;
    signal?: AbortSignal;
    correlationId?: string;
    validate?: boolean;
  }): Promise<ProviderInfo[]> {
    const path = '/providers';
    const data: any = await this.get(path, {
      refresh: options?.refresh,
      signal: options?.signal,
      correlationId: options?.correlationId,
      validate: options?.validate,
    });
    // Tolerate envelope-shaped responses from enterprise API: { providers: [...], total }
    if (Array.isArray(data)) return data as ProviderInfo[];
    if (data && Array.isArray((data as any).providers))
      return (data as any).providers as ProviderInfo[];
    if (data && data.data && Array.isArray((data as any).data.providers))
      return (data as any).data.providers as ProviderInfo[];
    return data as ProviderInfo[];
  }

  async getDatasets(options?: {
    refresh?: boolean;
    project?: string;
    signal?: AbortSignal;
    correlationId?: string;
    validate?: boolean;
  }): Promise<DatasetMeta[]> {
    const path = buildPath('/datasets', withProjectParam({}, options?.project));
    const data: any = await this.get(path, {
      refresh: options?.refresh,
      signal: options?.signal,
      correlationId: options?.correlationId,
      validate: options?.validate,
    });
    // Tolerate envelope-shaped responses similar to providers
    if (Array.isArray(data)) return data as DatasetMeta[];
    if (data && Array.isArray((data as any).datasets))
      return (data as any).datasets as DatasetMeta[];
    if (data && data.data && Array.isArray((data as any).data.datasets))
      return (data as any).data.datasets as DatasetMeta[];
    return data as DatasetMeta[];
  }

  async searchDatasets(
    params: DatasetSearchParams & {
      refresh?: boolean;
      signal?: AbortSignal;
      correlationId?: string;
      validate?: boolean;
    },
  ): Promise<DatasetSearchRow[]> {
    const { refresh, signal, correlationId, validate, ...query } = params || ({} as any);
    const path = buildPath('/datasets/search', query as any);
    return this.get(path, { refresh, signal, correlationId, validate });
  }

  async health(options?: { signal?: AbortSignal; correlationId?: string }): Promise<Healthz> {
    // Prefer legacy path used by the plugin, but fall back to enterprise '/health' if missing.
    const primary = '/healthz';
    try {
      return await this.get(primary, {
        signal: options?.signal,
        correlationId: options?.correlationId,
      });
    } catch (e: any) {
      // If the primary path is not found or not allowed, try the common '/health' path.
      const status = e && typeof e === 'object' ? (e as any).status : undefined;
      if (status === 404 || status === 405) {
        return this.get('/health', {
          signal: options?.signal,
          correlationId: options?.correlationId,
        });
      }
      throw e;
    }
  }

  async prefetchAll(params: { period?: string; project?: string; signal?: AbortSignal }): Promise<{
    overview: Overview[];
    breakdown: BreakdownRow[];
    alerts: ActionItem[];
    summary?: any;
    providers?: ProviderInfo[];
    datasets?: DatasetMeta[];
    correlationId: string;
    durationMs: number;
  }> {
    const period = params.period || 'P30D';
    const correlationId = this.uuid();
    // Use underlying fetch directly to share correlation id; versioned analytics endpoints
    const overviewPath = this.useVersionedAnalytics
      ? buildPath(
          '/api/v1/analytics/trends',
          withProjectParam({ period, granularity: 'day' }, params.project),
        )
      : buildPath('/costs/daily', withProjectParam({ period }, params.project));
    const breakdownPath = this.useVersionedAnalytics
      ? buildPath(
          '/api/v1/analytics/top-services',
          withProjectParam({ by: 'ServiceCategory', period }, params.project),
        )
      : buildPath(
          '/breakdown',
          withProjectParam({ by: 'ServiceCategory', period }, params.project),
        );
    const alertsPath = buildPath('/alerts', withProjectParam({}, params.project));
    const summaryPath = this.useVersionedAnalytics
      ? buildPath('/api/v1/analytics/summary', withProjectParam({ period }, params.project))
      : buildPath('/costs/summary', withProjectParam({ period }, params.project));
    const providersPath = '/providers';
    const datasetsPath = params.project
      ? buildPath('/datasets', withProjectParam({}, params.project))
      : undefined;
    const start = Date.now();
    const [overviewRaw, breakdownRaw, alerts, summaryRaw, providers, datasets] = await Promise.all([
      this.get(overviewPath, { signal: params.signal, correlationId }),
      this.get(breakdownPath, { signal: params.signal, correlationId }),
      this.get(alertsPath, { signal: params.signal, correlationId }),
      this.get(summaryPath, { signal: params.signal, correlationId }).catch(() => undefined),
      this.get(providersPath, { signal: params.signal, correlationId }).catch(() => undefined),
      datasetsPath
        ? this.get(datasetsPath, { signal: params.signal, correlationId }).catch(() => undefined)
        : Promise.resolve(undefined),
    ]);
    const overview = Array.isArray(overviewRaw)
      ? (overviewRaw as any[])
      : (overviewRaw as any)?.trends || (overviewRaw as any)?.data?.trends
        ? (((overviewRaw as any).trends || (overviewRaw as any)?.data?.trends) as any[])
        : (overviewRaw as any[]);
    const breakdown = Array.isArray(breakdownRaw)
      ? (breakdownRaw as any[])
      : (breakdownRaw as any)?.top_services || (breakdownRaw as any)?.data?.top_services
        ? (((breakdownRaw as any).top_services ||
            (breakdownRaw as any)?.data?.top_services) as any[])
        : (breakdownRaw as any[]);
    const summary = (summaryRaw as any)?.summary
      ? (summaryRaw as any).summary
      : (summaryRaw as any)?.data?.summary
        ? (summaryRaw as any).data.summary
        : summaryRaw;
    /* istanbul ignore next -- shape covered indirectly */
    return {
      overview,
      breakdown,
      alerts,
      summary,
      providers,
      datasets,
      correlationId,
      durationMs: Date.now() - start,
    } as any;
  }

  // Utilities
  invalidate(path?: string) {
    this.cache?.invalidate(path);
  }
  /** Backward-compatible alias */
  invalidateCache(key?: string) {
    this.invalidate(key);
  }
  subscribeCacheEvents(listener: any) {
    return (this.cache as any)?.subscribe?.(listener);
  }

  // --- Test-only helpers (introspection) ---
  // These are intentionally undocumented; unit tests access them via bracket notation.
  /** Returns the effective merged runtime configuration (constructor > app-config > defaults). */
  private _cfg() {
    return {
      timeoutMs: this.retryCfg.timeoutMs,
      cacheTtlMs: this.cfgValues.cacheTtlMs,
      retry: { ...this.retryCfg.retry },
      swr: { ...this.cfgValues.swr },
    };
  }
  /** Test hook: expose config via client['cfg']() */
  public ['cfg']() {
    return this._cfg();
  }
  /** Test hook: expose internalCacheEnabled via client['internalCacheEnabled']() */
  public ['internalCacheEnabled']() {
    return !!this.enableInternalCache;
  }
  /** Test hook: expose critical classification via client['isCritical'](e) */
  public ['isCritical'](err: any) {
    return _isCritical(err, (this.transportDeps as any).critical);
  }
}

// Public contract types
export type {
  CostscopeApi,
  Overview,
  BreakdownRow,
  ActionItem,
  Summary,
  ProviderInfo,
  DatasetMeta,
  DatasetSearchRow,
  DatasetSearchParams,
  Healthz,
} from './types';
export { isCostscopeError } from './core/errors';
export { CostscopeErrorCodes, type CostscopeErrorCode } from '../constants/errors';
export type { CostscopeError } from './core/errors';
