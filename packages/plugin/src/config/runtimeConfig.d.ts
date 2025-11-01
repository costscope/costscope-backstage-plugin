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
export interface RuntimeSwrConfig {
    enabled: boolean;
    staleFactor: number;
}
export interface EffectiveRuntimeConfig {
    serviceId: string;
    timeoutMs: number;
    cacheTtlMs: number;
    maxEntries?: number;
    enableInternalCache: boolean;
    retry: RuntimeRetryConfig;
    swr: RuntimeSwrConfig;
    critical?: {
        statuses?: number[];
        codes?: string[];
    };
    silent?: boolean;
}
export interface RuntimeConfigInput {
    options: any;
}
/**
 * Resolve runtime configuration with precedence:
 *  constructor option > app-config value > hard default.
 */
export declare function resolveRuntimeConfig({ options }: RuntimeConfigInput): EffectiveRuntimeConfig;
