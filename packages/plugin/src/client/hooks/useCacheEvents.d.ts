import type { CacheEvent } from '../telemetry/retryTelemetry';
/**
 * React hook subscribing to CostscopeClient cache/SWR events.
 * Example:
 *   useCacheEvents(ev => console.log(ev));
 */
/** @public */
export declare function useCacheEvents(listener: (e: CacheEvent) => void): void;
