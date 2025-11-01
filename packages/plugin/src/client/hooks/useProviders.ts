import { useApi } from '@backstage/core-plugin-api';
import { useQuery } from '@tanstack/react-query';

import { costscopeApiRef } from '..';
import { qk } from '../../utils/queryKeys';

import { useClientStaleTime } from './useClientStaleTime';

/**
 * Mini hook to fetch providers list via CostscopeClient.getProviders.
 * React Query staleTime is aligned with the client's cacheTtlMs.
 */
export function useProviders() {
  const api: any = useApi(costscopeApiRef);
  const staleTime = useClientStaleTime();
  return useQuery({
    queryKey: qk.providers(),
    queryFn: () => api.getProviders?.() as Promise<import('../..').ProviderInfo[]>,
    staleTime,
  });
}
