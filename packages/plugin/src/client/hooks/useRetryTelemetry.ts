import { useEffect } from 'react';

import { logger } from '../../utils/logger';
import { getRetryAttemptRecords } from '../telemetry/retryTelemetry';

/**
 * Debug hook: prints a summary table of retry statistics on unmount (dev mode).
 * Place once per page / in the plugin root component to analyze behavior.
 * In production: no-op.
 */
/** @public */
export function useRetryTelemetry() {
  useEffect(() => {
    const env = (globalThis as any)?.process?.env;
    if (env?.NODE_ENV === 'production') return;
    return () => {
      try {
        const recs = getRetryAttemptRecords();
        if (!recs.length) return;
        const agg: Record<string, { path: string; requests: number; successes: number; failures: number; totalAttempts: number; maxAttempts: number; lastStatus?: number; lastErrorCode?: string; totalDuration: number; maxDuration: number; totalOverviewLen: number; overviewSamples: number; totalBytes: number; maxBytes: number; totalItems: number; itemSamples: number; maxItems: number } > = {};
        for (const r of recs) {
          const a = (agg[r.path] ||= { path: r.path, requests: 0, successes: 0, failures: 0, totalAttempts: 0, maxAttempts: 0, totalDuration: 0, maxDuration: 0, totalOverviewLen: 0, overviewSamples: 0, totalBytes: 0, maxBytes: 0, totalItems: 0, itemSamples: 0, maxItems: 0 });
          a.requests += 1;
          if (r.success) a.successes += 1; else { a.failures += 1; a.lastErrorCode = r.code; }
          a.totalAttempts += r.attempts;
          if (r.attempts > a.maxAttempts) a.maxAttempts = r.attempts;
          if (r.status) a.lastStatus = r.status;
          if (typeof r.durationMs === 'number') {
            a.totalDuration += r.durationMs;
            if (r.durationMs > a.maxDuration) a.maxDuration = r.durationMs;
          }
          if (typeof r.overviewLength === 'number') {
            a.totalOverviewLen += r.overviewLength;
            a.overviewSamples += 1;
          }
          if (typeof r.responseBytes === 'number') {
            a.totalBytes += r.responseBytes;
            if (r.responseBytes > a.maxBytes) a.maxBytes = r.responseBytes;
          }
          if (typeof r.itemCount === 'number') {
            a.totalItems += r.itemCount;
            a.itemSamples += 1;
            if (r.itemCount > a.maxItems) a.maxItems = r.itemCount;
          }
        }
        const rows = Object.values(agg).map(a => ({
          Path: a.path,
          Requests: a.requests,
          Successes: a.successes,
          Failures: a.failures,
          'Avg Attempts': (a.totalAttempts / a.requests).toFixed(2),
          'Max Attempts': a.maxAttempts,
          'Last Status': a.lastStatus ?? '-',
          'Last ErrCode': a.lastErrorCode ?? '-',
          'Avg Duration ms': a.requests ? (a.totalDuration / a.requests).toFixed(1) : '-',
          'Max Duration ms': a.maxDuration || '-',
          'Avg Overview Len': a.overviewSamples ? Math.round(a.totalOverviewLen / a.overviewSamples) : '-',
          'Avg Bytes': a.requests ? Math.round(a.totalBytes / a.requests) : '-',
          'Max Bytes': a.maxBytes || '-',
          'Avg Items': a.itemSamples ? Math.round(a.totalItems / a.itemSamples) : '-',
          'Max Items': a.maxItems || '-',
        }));
        logger.table(rows); // debug output
      } catch (e) {
        logger.warn('[useRetryTelemetry] failed to summarise', e);
      }
    };
  }, []);
}
