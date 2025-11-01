import { useApi } from '@backstage/core-plugin-api';
import { useQuery } from '@tanstack/react-query';

import { costscopeApiRef } from '..';
import { qk } from '../../utils/queryKeys';

import { useClientStaleTime } from './useClientStaleTime';

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
export function useDatasetsSearch(params: UseDatasetsSearchParams) {
  const { enabled = true, ...filters } = params || {};
  const api: any = useApi(costscopeApiRef);
  const staleTime = useClientStaleTime();
  return useQuery({
    queryKey: qk.datasetsSearch(filters),
    queryFn: () => api.searchDatasets?.(filters) as Promise<import('../..').DatasetSearchRow[]>,
    staleTime,
    enabled,
  });
}
