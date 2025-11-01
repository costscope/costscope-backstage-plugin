import { useApi } from '@backstage/core-plugin-api';

import { costscopeApiRef } from '../apiRef';

/**
 * Returns the recommended React Query staleTime aligned with the CostscopeClient cacheTtlMs.
 * Falls back to 60_000 ms when unavailable.
 */
export function useClientStaleTime(): number {
  const api = useApi(costscopeApiRef) as any;
  try {
    const cfg = typeof api?.cfg === 'function' ? api.cfg() : undefined;
    const ttl = cfg?.cacheTtlMs;
    return typeof ttl === 'number' && isFinite(ttl) && ttl > 0 ? ttl : 60_000;
  } catch {
    return 60_000;
  }
}
