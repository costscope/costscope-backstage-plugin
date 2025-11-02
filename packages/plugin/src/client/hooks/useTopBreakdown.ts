import { useApi } from '@backstage/core-plugin-api';
import { useQuery } from '@tanstack/react-query';

import { costscopeApiRef } from '..';
import { qk } from '../../utils/queryKeys';

import { useClientStaleTime } from './useClientStaleTime';

/** @public */
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
 * @public
 */
export function useTopBreakdown({ dimension, period, limit = 5, project }: UseTopBreakdownParams) {
  const api: any = useApi(costscopeApiRef);
  const staleTime = useClientStaleTime();
  return useQuery<{ dim: string; cost: number; deltaPct: number }[]>({
    queryKey: qk.breakdown(dimension, period, project),
    queryFn: async () => {
      const rows = (await api.getBreakdown?.(dimension, period, { project })) as any[];
      if (!Array.isArray(rows)) return [] as any[];
      return rows
        .slice()
        .sort((a, b) => b.cost - a.cost)
        .slice(0, Math.max(0, limit));
    },
    staleTime,
    placeholderData: prev => prev,
  });
}
