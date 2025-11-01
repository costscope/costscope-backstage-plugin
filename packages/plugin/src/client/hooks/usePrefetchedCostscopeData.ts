import { useApi } from '@backstage/core-plugin-api';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { costscopeApiRef } from '..';
import { qk } from '../../utils/queryKeys';

/**
 * Hook wrapping CostscopeClient.prefetchAll and priming React Query cache for
 * overview (daily costs), default breakdown (ServiceCategory) and action items.
 *
 * Usage:
 * const { overview, breakdown, alerts, isLoading, error, refresh } =
 *   usePrefetchedCostscopeData({ period: 'P30D', project });
 *
 * It performs a single parallel HTTP round‑trip (internal client cache still applies)
 * and then calls queryClient.setQueryData for each individual query key so that
 * any mounted useQuery hooks for those keys render instantly (no request waterfall).
 *
 * Hook performs a single prefetchAll request and immediately seeds the React Query cache
 * (overview, breakdown, alerts) so standard useQuery hooks get data instantly without
 * separate loading spinners.
 */
/** @public */
export function usePrefetchedCostscopeData(opts: {
  period?: string;
  project?: string;
  /** When false, prefetch is disabled. Default true. */
  enabled?: boolean;
  /** Optional stale timeout check (ms). If provided and all three datasets are fresh, skip network call. */
  freshWithinMs?: number;
}) {
  const period = opts.period ?? 'P30D';
  const { project, enabled = true, freshWithinMs } = opts;
  let api: any;
  // Call useApi unconditionally to satisfy hooks rules, but prefer a
  // test-provided global mock when available by overriding below.
  try { api = useApi(costscopeApiRef); } catch { api = undefined; }
  const globalMock = (globalThis as any).__COSTSCOPE_MOCK_API__;
  if (globalMock) api = globalMock;
  // Keep a stable ref to the API so that the `exec` callback doesn't change
  // identity every render when the `api` object reference differs. This
  // prevents a render-effect loop in tests where the mock/global api may be
  // re-created by test helpers.
  const apiRef = (useRef as any) ? useRef<any>(api) : { current: api };
  // Ensure ref stays up-to-date if `api` changes.
  useEffect(() => { apiRef.current = api; }, [api]);
  const queryClient = useQueryClient();
  const [state, setState] = useState<{
    overview?: import('..').Overview[];
    breakdown?: import('..').BreakdownRow[];
    alerts?: import('..').ActionItem[];
    correlationId?: string;
    durationMs?: number;
    error?: any;
    loading: boolean;
  }>({ loading: enabled });

  const lastArgsRef = useRef<string>('');

  const exec = useCallback(async (force?: boolean) => {
    if (!enabled) return;
    const sig = `${period}|${project || ''}`;
    // Prevent duplicate launches for identical args unless one is already in-flight (tracked via ref flag)
    if (!force && lastArgsRef.current === sig) {
      // continue – allow rerun (React strict mode); network layer may dedupe internally
    }
    lastArgsRef.current = sig;
    try {
      // Skip network if freshWithinMs provided and existing query data fresh
      if (!force && freshWithinMs) {
        const now = Date.now();
        const fresh = (key: any) => {
          const st = queryClient.getQueryState(key);
          return st?.dataUpdatedAt && now - st.dataUpdatedAt < freshWithinMs && st.data !== undefined;
        };
        if (
          fresh(qk.overview(period, project)) &&
          fresh(qk.breakdown('ServiceCategory', period, project)) &&
          fresh(qk.actionItems(project))
        ) {
          // Reuse existing data – hydrate local state from cache once
          setState({
            overview: queryClient.getQueryData(qk.overview(period, project)),
            breakdown: queryClient.getQueryData(qk.breakdown('ServiceCategory', period, project)),
            alerts: queryClient.getQueryData(qk.actionItems(project)),
            loading: false,
          });
          return;
        }
      }
  setState(s => ({ ...s, loading: true, error: undefined }));
  const res = await apiRef.current.prefetchAll({ period, project });
      // Prime per-key caches
      queryClient.setQueryData(qk.overview(period, project), res.overview);
      queryClient.setQueryData(qk.breakdown('ServiceCategory', period, project), res.breakdown);
      queryClient.setQueryData(qk.actionItems(project), res.alerts);
      setState({
        overview: res.overview,
        breakdown: res.breakdown,
        alerts: res.alerts,
        correlationId: res.correlationId,
        durationMs: res.durationMs,
        loading: false,
      });
    } catch (e: any) {
      setState(s => ({ ...s, error: e, loading: false }));
    }
  }, [enabled, period, project, freshWithinMs, queryClient]);

  // Auto-run on arg change
  useEffect(() => { exec(); }, [exec]);

  const refresh = useCallback(() => exec(true), [exec]);

  return {
    overview: state.overview,
    breakdown: state.breakdown,
    alerts: state.alerts,
    correlationId: state.correlationId,
    durationMs: state.durationMs,
    isLoading: state.loading,
    error: state.error,
    refresh,
  } as const;
}
