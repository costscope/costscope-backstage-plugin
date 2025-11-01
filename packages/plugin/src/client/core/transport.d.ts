export interface TransportDeps {
    discoveryApi: any;
    fetchApi: any;
    identityApi: any;
    errorApi?: any;
    alertApi?: any;
    silent?: boolean;
    critical?: {
        statuses?: number[];
        codes?: string[];
    };
    serviceId?: string;
    largePayloadWarnedPaths: Set<string>;
}
export interface RetryConfig {
    timeoutMs: number;
    retry: {
        maxAttempts: number;
        retryOn: number[];
        backoffBaseMs: number;
        jitterFactor?: number;
    };
}
export declare function httpGet<T>(path: string, cfg: RetryConfig, deps: TransportDeps, correlationId: string, registerController?: (p: string, c: AbortController) => void, externalSignal?: AbortSignal, opts?: {
    validate?: boolean;
}): Promise<T>;
