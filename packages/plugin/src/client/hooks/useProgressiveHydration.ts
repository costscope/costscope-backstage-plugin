import { useApi } from '@backstage/core-plugin-api';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

import { costscopeApiRef } from '..';
import type { CostscopePrefetchManifest } from '../../ssr/hydration';

/**
 * Progressive hydration hook. Given a manifest (optionally from SSR),
 * it schedules background prefetches for queries that lack data in the manifest
 * or are considered lower priority. Uses requestIdleCallback when available.
 * @public
 */
export function useProgressiveHydration(manifest?: CostscopePrefetchManifest) {
  const queryClient = useQueryClient();
  let api: any;
  try {
    api = useApi(costscopeApiRef);
  } catch {
    api = (globalThis as any).__COSTSCOPE_MOCK_API__;
  }
  // If a global mock API is present for tests, prefer it over a no-op useApi result
  if ((globalThis as any).__COSTSCOPE_MOCK_API__) {
    api = (globalThis as any).__COSTSCOPE_MOCK_API__;
  }

  // Stabilize API reference so the effect callback identity doesn't change across renders.
  const apiRef = React.useRef<any>(api);
  React.useEffect(() => {
    apiRef.current = api ?? (globalThis as any).__COSTSCOPE_MOCK_API__;
  }, [api]);

  React.useEffect(() => {
    if (!manifest || !manifest.queries?.length) return;

    const schedule = (fn: () => void) => {
      const ric: any = (globalThis as any).requestIdleCallback;
      if (typeof ric === 'function') ric(fn, { timeout: 1500 });
      else setTimeout(fn, 0);
    };

    // Sort by priority (0 -> 1 -> 2)
    const items = [...manifest.queries].sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2));

    schedule(() => {
      // Schedule prefetches for items that don't have cached data
      items.forEach((q) => {
        // Skip if already in cache (SSR hydrated) and not stale (React Query manages staleness)
        const state = queryClient.getQueryState(q.key as any);
        if (state?.data !== undefined) return;

        // Map known keys to API calls for prefetch; unknown keys are ignored (extensible)
        const k = q.key as any[];
        const kind = String(k[1]);
  // Runtime check: prefer using provided apiRef; no-op otherwise
  if (kind === 'overview') {
          const [, , period, project] = k as [string, string, string, string];
          // Directly call API and populate cache so test environments without full
          // react-query background scheduling still get seeded deterministically.
          (async () => {
            try {
              const res = await Promise.resolve(apiRef.current.getOverview(period, { project }));
              try { queryClient.setQueryData(k, res); } catch (_e) { /* ignore */ }
            } catch (_) { /* ignore prefetch failures */ }
          })();
        } else if (kind === 'breakdown') {
          const [, , group, period, project] = k as [string, string, string, string, string];
          (async () => {
            try {
              const res = await Promise.resolve(apiRef.current.getBreakdown(group, period, { project }));
              try { queryClient.setQueryData(k, res); } catch (_e) { /* ignore */ }
            } catch (_) { /* ignore prefetch failures */ }
          })();
        } else if (kind === 'actionItems') {
          const [, , project] = k as [string, string, string];
          (async () => {
            try {
              const res = await Promise.resolve(apiRef.current.getActionItems({ project }));
              try { queryClient.setQueryData(k, res); } catch (_e) { /* ignore */ }
            } catch (_) { /* ignore prefetch failures */ }
          })();
        }
      });
    });
  }, [manifest, queryClient]);
}
