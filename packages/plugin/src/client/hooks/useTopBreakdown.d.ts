export interface UseTopBreakdownParams {
    /** Dimension/group name (e.g. ServiceCategory, RegionId, ChargeCategory, etc.) */
    dimension: string;
    /** Period ISO8601 duration (e.g. P30D) */
    period: string;
    /** Max rows to return (after sorting desc by cost). Default 5. */
    limit?: number;
    /** Optional project scope */
    project?: string;
}
/**
 * useTopBreakdown – thin wrapper over getBreakdown returning the top N rows by cost.
 * Keeps staleTime aligned with CostscopeClient internal TTL to avoid duplicate refetch.
 */
export declare function useTopBreakdown({ dimension, period, limit, project }: UseTopBreakdownParams): import("@tanstack/react-query").UseQueryResult<{
    dim: string;
    cost: number;
    deltaPct: number;
}[], Error>;
