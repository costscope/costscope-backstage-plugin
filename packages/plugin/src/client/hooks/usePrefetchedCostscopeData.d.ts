/**
 * Hook wrapping CostscopeClient.prefetchAll and priming React Query cache for
 * overview (daily costs), default breakdown (ServiceCategory) and action items.
 *
 * Usage:
 * const { overview, breakdown, alerts, isLoading, error, refresh } =
 *   usePrefetchedCostscopeData({ period: 'P30D', project });
 *
 * It performs a single parallel HTTP round‑trip (internal client cache still applies)
 * and then calls queryClient.setQueryData for each individual query key so that
 * any mounted useQuery hooks for those keys render instantly (no request waterfall).
 *
 * Hook performs a single prefetchAll request and immediately seeds the React Query cache
 * (overview, breakdown, alerts) so standard useQuery hooks get data instantly without
 * separate loading spinners.
 */
/** @public */
export declare function usePrefetchedCostscopeData(opts: {
    period?: string;
    project?: string;
    /** When false, prefetch is disabled. Default true. */
    enabled?: boolean;
    /** Optional stale timeout check (ms). If provided and all three datasets are fresh, skip network call. */
    freshWithinMs?: number;
}): {
    readonly overview: {
        date: string;
        cost: number;
    }[] | undefined;
    readonly breakdown: {
        dim: string;
        cost: number;
        deltaPct: number;
    }[] | undefined;
    readonly alerts: {
        id: string;
        severity: "info" | "warn" | "critical";
        message: string;
    }[] | undefined;
    readonly correlationId: string | undefined;
    readonly durationMs: number | undefined;
    readonly isLoading: boolean;
    readonly error: any;
    readonly refresh: () => Promise<void>;
};
