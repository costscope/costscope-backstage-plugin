import { DEFAULT_SERVICE_ID, resolveServiceId } from '../constants';

export interface RuntimeRetryConfig {
  maxAttempts: number;
  backoffBaseMs: number;
  retryOn: number[];
  /**
   * Jitter factor (0-1). 0 = no jitter (pure exponential backoff).
   * Value f produces a uniformly random delay in the range [base*(1-f), base].
   * This is the "equal jitter" pattern – it shrinks the lower bound while keeping
   * an upper cap of the original exponential value to reduce coordinated thundering herd.
   */
  jitterFactor: number;
}

export interface RuntimeSwrConfig { enabled: boolean; staleFactor: number }

export interface EffectiveRuntimeConfig {
  serviceId: string;
  timeoutMs: number;
  cacheTtlMs: number;
  maxEntries?: number;
  enableInternalCache: boolean;
  retry: RuntimeRetryConfig;
  swr: RuntimeSwrConfig;
  critical?: { statuses?: number[]; codes?: string[] };
  silent?: boolean;
}

export interface RuntimeConfigInput {
  options: any; // raw constructor options (loose typing for internal helper)
}

/**
 * Resolve runtime configuration with precedence:
 *  constructor option > app-config value > hard default.
 */
export function resolveRuntimeConfig({ options }: RuntimeConfigInput): EffectiveRuntimeConfig {
  const o = options || {};
  const configApi = (o as any).configApi;

  const safe = <T>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };
  const readNumber = (path: string, d: number) => safe(() => configApi?.getOptionalNumber?.(path) ?? d, d);
  const readBoolean = (path: string) => safe(() => configApi?.getOptionalBoolean?.(path), undefined as boolean | undefined);
  const readRetryOnFromConfig = (): number[] | undefined => safe(() => {
    const arr = configApi?.getOptionalConfigArray?.('costscope.client.retry.retryOn');
    if (!Array.isArray(arr)) return undefined;
    const out: number[] = [];
    for (const v of arr) {
      if (typeof v === 'number') out.push(v);
      else if (typeof (v as any)?.getNumber === 'function') {
        try { out.push((v as any).getNumber('')); } catch { /* ignore */ }
      }
    }
    return out.length ? out : undefined;
  }, undefined);

  const serviceId: string = o.serviceId || safe(() => resolveServiceId(configApi), DEFAULT_SERVICE_ID);
  const timeoutMs: number = o.timeoutMs ?? readNumber('costscope.client.timeoutMs', 10_000);
  const cacheTtlMs: number = o.cacheTtlMs ?? readNumber('costscope.client.cacheTtlMs', 60_000);
  const retryOn: number[] = o.retry?.retryOn ?? readRetryOnFromConfig() ?? [502, 503, 504];
  const maxEntries: number | undefined = o.maxEntries ?? readNumber('costscope.client.maxEntries', 0);
  const rawJitter = o.retry?.jitterFactor ?? readNumber('costscope.client.retry.jitterFactor', 0);
  const jitterFactor = Math.min(1, Math.max(0, isFinite(rawJitter) ? rawJitter : 0));
  const retry: RuntimeRetryConfig = {
    maxAttempts: o.retry?.maxAttempts ?? readNumber('costscope.client.retry.maxAttempts', 3),
    backoffBaseMs: o.retry?.backoffBaseMs ?? readNumber('costscope.client.retry.backoffBaseMs', 200),
    retryOn,
    jitterFactor,
  };
  const enableInternalCache: boolean =
    o.enableInternalCache !== undefined
      ? o.enableInternalCache
      : (readBoolean('costscope.client.enableInternalCache') ?? true);
  const swr: RuntimeSwrConfig = {
    enabled: (o as any).swr?.enabled ?? false,
    staleFactor: Math.max(1, (o as any).swr?.staleFactor ?? 3),
  };

  return { serviceId, timeoutMs, cacheTtlMs, maxEntries: (maxEntries ?? 0) > 0 ? maxEntries : undefined, enableInternalCache, retry, swr, critical: o.critical, silent: o.silent };
}
