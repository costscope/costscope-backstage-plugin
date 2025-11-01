export interface UseDatasetsSearchParams {
    project?: string;
    provider?: string;
    status?: string;
    from?: string;
    to?: string;
    minRecords?: number;
    maxRecords?: number;
    limit?: number;
    /** When false, disables the query. */
    enabled?: boolean;
}
/**
 * Mini hook wrapping CostscopeClient.searchDatasets. Provides a stable React Query key
 * derived from filter params so multiple components share cache.
 * Uses staleTime aligned with client's cacheTtlMs to avoid duplicate refetch loops
 * when internal TTL cache is also enabled.
 */
export declare function useDatasetsSearch(params: UseDatasetsSearchParams): import("@tanstack/react-query").UseQueryResult<{
    id: string;
    provider: string;
    project: string;
    status: string;
    records: number;
    periodStart: string;
    periodEnd: string;
    lastIngestedAt?: string | undefined;
}[], Error>;
