import { QueryKey, UseQueryResult } from '@tanstack/react-query';
/**
 * Generic hook for the refresh pattern: invalidate + refetch + (optional) analytics event.
 * Pass the original useQuery result and the query key (or its factory) plus optional event attrs.
 * Returns: { isFetching, refresh }.
 */
export declare function useRefetchableCostscope<TData>(queryResult: Pick<UseQueryResult<TData, any>, 'refetch' | 'isFetching'>, opts: {
    /** Full query key used in useQuery */
    queryKey: QueryKey;
    /** Name of target UI block (overview|breakdown|actionItems|custom) */
    target: string;
    /** Additional analytics attributes (period, group, project, location...) */
    attrs?: Record<string, any>;
    /** Optional fresh fetcher that must bypass internal client TTL cache (calls API with {refresh:true}). */
    fetchFresh?: () => Promise<TData>;
}): {
    isFetching: boolean;
    refresh: () => Promise<void>;
};
