import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { waitFor } from '@testing-library/react';

import { hydrateFromManifest, readManifestFromDocument } from './hydration';
import { qk } from '../queryKeys';
import { useProgressiveHydration } from '../client/hooks';

describe('SSR hydration smoke', () => {
  const originalRequestIdleCallback = (globalThis as any).requestIdleCallback;
  beforeAll(() => {
    // Ensure requestIdleCallback exists for the hook; run immediately.
    (globalThis as any).requestIdleCallback = (cb: any) => cb();
  });
  afterAll(() => {
    (globalThis as any).requestIdleCallback = originalRequestIdleCallback;
  });

  it('hydrateFromManifest seeds cache and is idempotent', async () => {
    const period = 'P5D';
    const project = '';
    const overview = [
      { date: '2025-01-01', cost: 1 },
      { date: '2025-01-02', cost: 2 },
    ];
    const breakdown = [{ dim: 'Compute', cost: 10, deltaPct: 0.1 }];
    const manifest = {
      version: 1 as const,
      ts: Date.now(),
      params: { period, project },
      queries: [
        { key: qk.overview(period, project), endpoint: '/costs/daily', priority: 0 as const, data: overview },
        { key: qk.breakdown('ServiceCategory', period, project), endpoint: '/breakdown', priority: 1 as const, data: breakdown },
      ],
    };

    // Minimal document with embedded JSON manifest
    const doc = {
      getElementById: (id: string) =>
        id === 'costscope-prefetch'
          ? ({ tagName: 'SCRIPT', type: 'application/json', textContent: JSON.stringify(manifest) } as any)
          : null,
    } as Document;

    // readManifestFromDocument should parse correctly
    const parsed = readManifestFromDocument(doc);
    expect(parsed?.version).toBe(1);

    const qc = new QueryClient();
    const m1 = hydrateFromManifest(qc, doc);
    expect(m1).toBeTruthy();
    // First hydration seeds both queries
    expect(qc.getQueryData(qk.overview(period, project))).toEqual(overview);
    expect(qc.getQueryData(qk.breakdown('ServiceCategory', period, project))).toEqual(breakdown);

    // Second hydration is a no-op w.r.t. state changes (idempotent)
    const m2 = hydrateFromManifest(qc, doc);
    expect(m2).toBeTruthy();
    expect(qc.getQueryData(qk.overview(period, project))).toEqual(overview);
    expect(qc.getQueryData(qk.breakdown('ServiceCategory', period, project))).toEqual(breakdown);
  });

  it('useProgressiveHydration prefetches missing queries from manifest', async () => {
    const period = 'P7D';
    const project = '';
    const overview = [{ date: '2025-02-01', cost: 3 }];
    const breakdown = [{ dim: 'Storage', cost: 5, deltaPct: -0.02 }];

    // Provide mock API for the hook to call (falls back to global when useApi is unavailable)
    (globalThis as any).__COSTSCOPE_MOCK_API__ = {
      getOverview: async () => overview,
      getBreakdown: async () => breakdown,
      getActionItems: async () => [],
    };

    // Manifest: overview has data (P0), breakdown is missing data and should be prefetched by the hook
    const manifest = {
      version: 1 as const,
      ts: Date.now(),
      params: { period, project },
      queries: [
        { key: qk.overview(period, project), endpoint: '/costs/daily', priority: 0 as const, data: overview },
        { key: qk.breakdown('ServiceCategory', period, project), endpoint: '/breakdown', priority: 1 as const },
      ],
    };

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    // Seed from SSR first, then progressively hydrate the missing one
    hydrateFromManifest(qc, {
      getElementById: (id: string) =>
        id === 'costscope-prefetch'
          ? ({ tagName: 'SCRIPT', type: 'application/json', textContent: JSON.stringify(manifest) } as any)
          : null,
    } as Document);

    const Harness = () => {
      useProgressiveHydration(manifest as any);
      return null;
    };

    render(
      <QueryClientProvider client={qc}>
        <Harness />
      </QueryClientProvider>,
    );

    // Overview was present immediately; breakdown should arrive via prefetch
    expect(qc.getQueryData(qk.overview(period, project))).toEqual(overview);
    await waitFor(() => {
      const got = qc.getQueryData(qk.breakdown('ServiceCategory', period, project));
      expect(Array.isArray(got) && (got as any[]).length === 1).toBe(true);
    });
  });
});
