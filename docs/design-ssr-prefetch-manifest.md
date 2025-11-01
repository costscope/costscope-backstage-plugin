# Progressive Hydration for Costscope: SSR Prefetch Manifest — Design

This document describes adding progressive hydration via an SSR prefetch manifest for Costscope pages/widgets inside Backstage. Goal: reduce TTI and perceived latency by pre‑fetching critical data server‑side, embedding it in HTML, and progressively activating the remaining fetches on the client without unnecessary network or bundle overhead.

## Goals / Success Criteria

- Improved TTI/first paint: the first screen renders the Overview data without spinners when SSR is enabled.
- Remaining data (Breakdown, Action Items) loads after first paint without layout shift.
- Token safety: no secrets/headers embedded in HTML.
- Compatibility: absence of SSR/manifest falls back gracefully to current CSR logic.
- Size budget: do not push default ESM path above 55KB gzip; heavy parts remain lazy.
- Repo rules alignment:
  - no direct `console.*` in `src/` (use `logger`),
  - no hardcoded service id (use `DEFAULT_SERVICE_ID` / `resolveServiceId`),
  - minimal new dependencies; leverage React Query + existing client.

## Terminology

- SSR Prefetch Manifest ("manifest") — JSON structure embedded in HTML at SSR describing preloaded data and hinting subsequent request priorities.
- Progressive Hydration — staged activation: render critical first, then background fetch lower‑priority data.

## Requirements / Constraints

- React + MUI v5, @tanstack/react-query.
- CostscopeClient manages timeout/retry/error; Zod validation only when `COSTSCOPE_RUNTIME_VALIDATE=true` (lazy, off hot path).
- Prefer React Query as single cache during SSR; disable internal TTL cache server‑side to avoid duplication.
- Preserve a shared `correlationId` across server prefetch and client follow‑ups for tracing.

## User Scenarios (examples)

- Visiting Costscope page: server preloads Overview for `DEFAULT_PERIOD` and optional `PROJECT_ANNOTATION`; client hydrates cache immediately and renders chart. Breakdown + Action Items fetched by priority.
- Entity tab: similar, React Query keys include `project` from annotation.

## Architecture

### Flow

1. SSR: server builds manifest and embeds in HTML (`<script type="application/json" id="costscope-prefetch">…`).
2. Client: on startup reads manifest, hydrates React Query cache, launches progressive background fetches (idle/after paint).
3. No manifest → normal CSR path.

### Manifest Format (draft)

```ts
type CostscopePrefetchManifest = {
  version: 1;
  ts: number; // Date.now() on server
  correlationId: string; // shared across request series
  serviceId: string; // from resolveServiceId
  params: {
    period?: string; // e.g. DEFAULT_PERIOD
    project?: string; // from PROJECT_ANNOTATION if present
  };
  // Registry of queries & hydration order
  queries: Array<{
    key: readonly unknown[]; // React Query key
    endpoint: string; // path without origin, e.g. "/costs/daily"
    priority: 0 | 1 | 2; // 0 critical, 1 important, 2 background
    staleTimeMs?: number; // recommended staleness window
    data?: unknown; // serialized data if prefetched
    meta?: { itemCount?: number; bytes?: number }; // optional metrics summary
  }>;
  // Optional browser link hints (<link rel="preload"/"prefetch">)
  linkHints?: Array<{
    rel: 'preload' | 'prefetch';
    href: string; // data path only (no JS)
    as?: 'fetch';
    crossOrigin?: 'use-credentials' | 'anonymous';
  }>;
};
```

Notes:

- `data` never includes secrets/headers—only raw JSON bodies.
- Could embed a full React Query `dehydrate()` snapshot, but `queries[].data` + manual `queryClient.setQueryData()` is typically enough.

### Query Priorities

- P0 (critical first paint):
  - `getOverview(period, project)` time series for Overview card.
- P1 (important):
  - `getBreakdown(dim=DEFAULT_BREAKDOWN_DIMENSION, period, project)` breakdown table.
- P2 (background):
  - `getActionItems(project)` action items panel.

Priorities can be made configurable later.

## Server Integration (SSR)

- Integration point: Backstage SSR render pipeline before HTML flush.
- Prefer single `QueryClient` + `dehydrate()` or manual `queries[].data` population.
- Client instantiation: `serviceId = resolveServiceId(configApi)`, `enableInternalCache:false` server‑side to avoid duplicate caching; timeouts/retries from config.
- Execute P0 synchronously; optionally prefetch P1/P2 if latency budget allows; otherwise let client fetch.

Utility sketch (server‑only; may live as example vs exported helper initially):

```ts
// server/buildPrefetchManifest.ts (interface sketch)
import {
  CostscopeClient,
  DEFAULT_PERIOD,
  DEFAULT_BREAKDOWN_DIMENSION,
  resolveServiceId,
} from '@costscope/backstage-plugin';

export async function buildCostscopePrefetchManifest(args: {
  configApi: any;
  discoveryApi: any;
  fetchApi: any;
  identityApi: any;
  errorApi?: any;
  alertApi?: any; // optional server-side
  period?: string;
  project?: string;
  includeP1?: boolean; // prefetch breakdown server-side
  includeP2?: boolean; // prefetch action items server-side
}): Promise<CostscopePrefetchManifest> {
  const serviceId = resolveServiceId(args.configApi);
  const client = new CostscopeClient({
    ...args,
    serviceId,
    silent: true,
    enableInternalCache: false,
  });

  const period = args.period ?? DEFAULT_PERIOD;
  const project = args.project;

  const correlationId = crypto.randomUUID();

  // P0: Overview
  const overview = await client.getOverview(period, { project, signal: undefined });

  // P1/P2 based on flags / SSR budget
  const [breakdown, alerts] = await Promise.all([
    args.includeP1
      ? client.getBreakdown(DEFAULT_BREAKDOWN_DIMENSION, period, { project })
      : Promise.resolve(undefined),
    args.includeP2 ? client.getActionItems({ project }) : Promise.resolve(undefined),
  ]);
}

Embed in HTML via `<script type="application/json" id="costscope-prefetch">{...}</script>`.

Security: never serialize tokens/headers—only public JSON bodies.
    serviceId,
    params: { period, project },
    queries: [
      {
        key: ['costscope', 'overview', period, project],
        endpoint: '/costs/daily',
        priority: 0,
        data: overview,
      },
      breakdown && {
        key: ['costscope', 'breakdown', DEFAULT_BREAKDOWN_DIMENSION, period, project],
        endpoint: '/breakdown',
        priority: 1,
        data: breakdown,
      },
      alerts && {
        key: ['costscope', 'alerts', project],
        endpoint: '/alerts',
        priority: 2,
        data: alerts,
      },
    ].filter(Boolean) as any,
  };
}
```

## Client Integration

- On load locate `#costscope-prefetch`; if present parse JSON.
- For each `queries` entry call `queryClient.setQueryData(key, data)`; optionally honor `staleTimeMs`.
- Progressive fetching:
  - P1: schedule via `requestIdleCallback` or post‑paint microtask.
  - P2: after P1 completes or later idle.
- Persist `correlationId` for telemetry/log correlation.

Minimal example (client):

```ts
import { QueryClient } from '@tanstack/react-query';
import { hydrateFromManifest, useProgressiveHydration } from '@costscope/backstage-plugin';

const queryClient = new QueryClient();
const manifest = hydrateFromManifest(queryClient);
useProgressiveHydration(manifest);
```

Client utility sketch:

```ts
// client/hydrateFromManifest.ts
export function hydrateFromManifest(queryClient: QueryClient, doc: Document = document) {
  const el = doc.getElementById('costscope-prefetch');
  if (!el || el.tagName !== 'SCRIPT' || (el as HTMLScriptElement).type !== 'application/json')
    return undefined;
  try {
    const manifest = JSON.parse(el.textContent || '');
    for (const q of manifest.queries || []) {
      if (q.data !== undefined && q.key) {
        queryClient.setQueryData(q.key, q.data);
      }
    }
    return manifest as CostscopePrefetchManifest;
  } catch {
    // swallow parse errors — degrade to CSR
    return undefined;
  }
}
```

Progressive background fetching is implemented in a wrapper hook:

- `useProgressiveHydration(manifest)` schedules `prefetchQuery` for entries without `data` or considered stale.

## Errors / Retries / Telemetry

- Errors still mapped to `CostscopeError`; critical toasts governed by `silent` / `critical` (SSR typically `silent:true`).
- `correlationId` from manifest is attached to logs for end‑to‑end tracing.
- No direct `console.*`; use `logger`.

## Bundle Size / Lazy Paths

- Manifest logic is thin and adds no heavy deps.
- Optional validation (Zod) already lazy via env flag; default path unaffected.

## Accessibility (a11y)

- P0 sans spinners reduces live region churn for screen readers.
- Remaining regions keep clear ARIA loading states; progressive hydration must not hijack focus.

## Testing

- Unit:
  - builder: manifest format, priorities, absence of secrets.
  - hydration: `hydrateFromManifest` populates cache.
- Integration:
  - SSR snapshot with script tag present.
  - After hydration P0 Overview component renders without loading state.
- Storybook:
  - Decorator simulating manifest (`window.__injectCostscopeManifest(...)`).

## Compatibility / Graceful Degradation

- No SSR → no script → standard CSR.
- Invalid manifest → ignored, fallback CSR.
- Divergent `serviceId` → inconsequential if Discovery correct; cache keys remain domain specific.

## Implementation Steps

1. Internal utilities (initially non‑public):

- `buildCostscopePrefetchManifest` (server example) — document usage; consider experimental export later.
- Already implemented: `hydrateFromManifest` + `useProgressiveHydration` public exports.
- Example SSR embed: see `docs/ssr-integration-example.md`.

2. Hook integration:

- `usePrefetchedCostscopeData` detects warm cache, avoids duplicate initial load.

3. Tests (Jest + RTL).
4. Docs (README brief pointer + this design doc).
5. (Optional) Add `linkHints` for `<link rel="prefetch">`.

## Risks / Mitigations

- Double caches (internal TTL vs React Query): disable internal cache server‑side; align `staleTime` client‑side.
- Increased SSR latency: restrict to P0, rest on client idle.
- Key divergence: centralize key generation (reuse existing patterns including `project`).

## Open Questions / Gaps

- Backstage SSR adoption varies. Repo lacks server runtime—need a `@backstage/plugin-app-backend` integration how‑to (gap to add).
- Export `buildCostscopePrefetchManifest`? Start with docs example; consider experimental export later.

## Minimal API Contract (draft)

- `hydrateFromManifest(queryClient, doc?) -> manifest | undefined` client utility.
- `useProgressiveHydration(manifest, options?)` schedules background loads by priority.
- (Opt) `createServerPrefetcher(configs) -> build(manifestArgs)` server helper (experimental).

## Definition of Done

- Unit/integration tests green; ≥80% coverage maintained.
- No increase to default ESM bundle; client utilities remain light.
- Documentation and integration example added; Storybook demonstrates SSR hydration.
- Policy compliance: logging via `logger`, no hardcoded serviceId, a11y preserved.
