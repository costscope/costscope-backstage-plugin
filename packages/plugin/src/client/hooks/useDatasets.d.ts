/**
 * Mini hook wrapping CostscopeClient.getDatasets (recent ingestion metadata).
 * Aligns staleTime with client cacheTtlMs to avoid duplicate refetch churn.
 */
export declare function useDatasets(params?: {
    project?: string;
    limit?: number;
}): import("@tanstack/react-query").UseQueryResult<any[], Error>;
