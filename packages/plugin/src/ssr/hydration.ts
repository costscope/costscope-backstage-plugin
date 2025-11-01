import { QueryClient } from '@tanstack/react-query';

import { DEFAULT_SERVICE_ID } from '../constants';
import { qk } from '../queryKeys';

/**
 * SSR Prefetch Manifest type used to hydrate React Query cache on the client.
 * Keep this minimal and stable; avoid including any sensitive info.
 */
export type CostscopePrefetchManifest = {
  version: 1;
  ts: number;
  correlationId?: string;
  serviceId?: string;
  params?: { period?: string; project?: string };
  queries: Array<{
    key: readonly unknown[];
    endpoint: string;
    priority?: 0 | 1 | 2;
    staleTimeMs?: number;
    data?: unknown;
    meta?: { itemCount?: number; bytes?: number };
  }>;
  linkHints?: Array<{ rel: 'preload' | 'prefetch'; href: string; as?: 'fetch'; crossOrigin?: 'use-credentials' | 'anonymous' }>;
};

const SCRIPT_ID = 'costscope-prefetch';

/**
 * Reads and parses the inlined SSR prefetch manifest from a Document.
 */
/** @public */
export function readManifestFromDocument(doc?: Document): CostscopePrefetchManifest | undefined {
  const d = doc ?? ((globalThis as any).document as Document | undefined);
  if (!d) return undefined;
  const el = d.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (!el || el.tagName !== 'SCRIPT' || el.type !== 'application/json') return undefined;
  try {
    const json = el.textContent || '';
    if (!json.trim()) return undefined;
    return JSON.parse(json) as CostscopePrefetchManifest;
  } catch {
    // fail open – just ignore malformed manifest
    return undefined;
  }
}

/**
 * Hydrates React Query cache from the SSR prefetch manifest, if present.
 * Returns the manifest (if any) for further progressive hydration steps.
 */
/** @public */
export function hydrateFromManifest(queryClient: QueryClient, doc?: Document): CostscopePrefetchManifest | undefined {
  const manifest = readManifestFromDocument(doc);
  if (!manifest) return undefined;

  for (const q of manifest.queries || []) {
    if (q?.key && 'data' in q && q.data !== undefined) {
      // Trust server-provided data and seed cache immediately.
      queryClient.setQueryData(q.key as any, q.data);
      // Optional: could set meta staleTime via query options in actual useQuery calls.
    }
  }

  return manifest;
}

/**
 * Type guard for known Costscope query keys to help with endpoint mapping.
 */
export function isOverviewKey(key: readonly unknown[]): key is ReturnType<typeof qk.overview> {
  return key[0] === DEFAULT_SERVICE_ID && key[1] === 'overview';
}

export function isBreakdownKey(key: readonly unknown[]): key is ReturnType<typeof qk.breakdown> {
  return key[0] === DEFAULT_SERVICE_ID && key[1] === 'breakdown';
}

export function isAlertsKey(key: readonly unknown[]): key is ReturnType<typeof qk.actionItems> {
  return key[0] === DEFAULT_SERVICE_ID && key[1] === 'actionItems';
}
