import { useApi } from '@backstage/core-plugin-api';
import { useQuery } from '@tanstack/react-query';

import { costscopeApiRef } from '..';
import { qk } from '../../utils/queryKeys';

import { useClientStaleTime } from './useClientStaleTime';

/**
 * Mini hook wrapping CostscopeClient.getDatasets (recent ingestion metadata).
 * Aligns staleTime with client cacheTtlMs to avoid duplicate refetch churn.
 * @public
 */
export function useDatasets(params?: { project?: string; limit?: number }) {
  const project = params?.project;
  const limit = params?.limit;
  const api: any = useApi(costscopeApiRef);
  const staleTime = useClientStaleTime();
  return useQuery({
    queryKey: qk.datasets(project),
    queryFn: async () => {
      const rows = (await api.getDatasets?.({ project })) as any[];
      if (!Array.isArray(rows)) return [] as any[];
      if (typeof limit === 'number') return rows.slice(0, limit);
      return rows;
    },
    staleTime,
  });
}
