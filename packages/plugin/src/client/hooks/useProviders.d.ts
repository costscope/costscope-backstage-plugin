/**
 * Mini hook to fetch providers list via CostscopeClient.getProviders.
 * React Query staleTime is aligned with the client's cacheTtlMs.
 */
export declare function useProviders(): import("@tanstack/react-query").UseQueryResult<{
    id: string;
    displayName: string;
    status: string;
    services?: number | undefined;
    lastUpdated?: string | undefined;
}[], Error>;
