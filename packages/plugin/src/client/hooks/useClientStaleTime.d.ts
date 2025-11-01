/**
 * Returns the recommended React Query staleTime aligned with the CostscopeClient cacheTtlMs.
 * Falls back to 60_000 ms when unavailable.
 */
export declare function useClientStaleTime(): number;
