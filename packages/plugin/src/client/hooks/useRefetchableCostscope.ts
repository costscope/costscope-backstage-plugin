import { analyticsApiRef, useApi } from '@backstage/core-plugin-api';
import { useQueryClient, QueryKey, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { DEFAULT_SERVICE_ID } from '../../constants';

/**
 * Generic hook for the refresh pattern: invalidate + refetch + (optional) analytics event.
 * Pass the original useQuery result and the query key (or its factory) plus optional event attrs.
 * Returns: { isFetching, refresh }.
 */
export function useRefetchableCostscope<TData>(
  queryResult: Pick<UseQueryResult<TData, any>, 'refetch' | 'isFetching'>,
  opts: {
    /** Full query key used in useQuery */
    queryKey: QueryKey;
    /** Name of target UI block (overview|breakdown|actionItems|custom) */
    target: string;
    /** Additional analytics attributes (period, group, project, location...) */
    attrs?: Record<string, any>;
    /** Optional fresh fetcher that must bypass internal client TTL cache (calls API with {refresh:true}). */
    fetchFresh?: () => Promise<TData>;
  },
) {
  const queryClient = useQueryClient();
  let analytics: any | undefined; try { analytics = useApi(analyticsApiRef); } catch { analytics = undefined; }
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (opts.fetchFresh) {
        // Explicit fresh fetch that bypasses the client's internal TTL cache
        const data = await opts.fetchFresh();
        queryClient.setQueryData(opts.queryKey, data);
      } else {
        // Fallback: classic invalidation + refetch path
        queryClient.invalidateQueries({ queryKey: opts.queryKey });
        await queryResult.refetch();
      }
      if (analytics?.captureEvent) {
        try {
          analytics.captureEvent({
            context: DEFAULT_SERVICE_ID,
            action: `${DEFAULT_SERVICE_ID}.refresh.click`,
            attributes: { target: opts.target, ...(opts.attrs || {}) },
          });
        } catch { /* noop */ }
      }
    } finally {
      setRefreshing(false);
    }
  }, [analytics, opts, queryClient, queryResult]);

  return { isFetching: queryResult.isFetching || refreshing, refresh };
}
