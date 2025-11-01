import { QueryClient } from '@tanstack/react-query';
import { qk } from '../queryKeys';
/**
 * SSR Prefetch Manifest type used to hydrate React Query cache on the client.
 * Keep this minimal and stable; avoid including any sensitive info.
 */
export type CostscopePrefetchManifest = {
    version: 1;
    ts: number;
    correlationId?: string;
    serviceId?: string;
    params?: {
        period?: string;
        project?: string;
    };
    queries: Array<{
        key: readonly unknown[];
        endpoint: string;
        priority?: 0 | 1 | 2;
        staleTimeMs?: number;
        data?: unknown;
        meta?: {
            itemCount?: number;
            bytes?: number;
        };
    }>;
    linkHints?: Array<{
        rel: 'preload' | 'prefetch';
        href: string;
        as?: 'fetch';
        crossOrigin?: 'use-credentials' | 'anonymous';
    }>;
};
/**
 * Reads and parses the inlined SSR prefetch manifest from a Document.
 */
/** @public */
export declare function readManifestFromDocument(doc?: Document): CostscopePrefetchManifest | undefined;
/**
 * Hydrates React Query cache from the SSR prefetch manifest, if present.
 * Returns the manifest (if any) for further progressive hydration steps.
 */
/** @public */
export declare function hydrateFromManifest(queryClient: QueryClient, doc?: Document): CostscopePrefetchManifest | undefined;
/**
 * Type guard for known Costscope query keys to help with endpoint mapping.
 */
export declare function isOverviewKey(key: readonly unknown[]): key is ReturnType<typeof qk.overview>;
export declare function isBreakdownKey(key: readonly unknown[]): key is ReturnType<typeof qk.breakdown>;
export declare function isAlertsKey(key: readonly unknown[]): key is ReturnType<typeof qk.actionItems>;
