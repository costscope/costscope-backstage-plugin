import type { CostscopePrefetchManifest } from '../../ssr/hydration';
/**
 * Progressive hydration hook. Given a manifest (optionally from SSR),
 * it schedules background prefetches for queries that lack data in the manifest
 * or are considered lower priority. Uses requestIdleCallback when available.
 * @public
 */
export declare function useProgressiveHydration(manifest?: CostscopePrefetchManifest): void;
