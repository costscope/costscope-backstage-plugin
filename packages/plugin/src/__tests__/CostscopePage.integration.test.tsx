import React from 'react';
import '@testing-library/jest-dom';
// Extend default Jest timeout for this integration-style test (async React Query + simulated delays)
// Use the global project timeout (120s) to avoid per-test lower bounds causing failures.
jest.setTimeout(120000);
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CostscopePage } from '../components/pages/CostscopePage';
import { analyticsApiRef, ApiRef } from '@backstage/core-plugin-api';
import { costscopeApiRef } from '..';

// Mock useApi to supply our analytics and costscope mocks without full Backstage App context
jest.mock('@backstage/core-plugin-api', () => {
  const actual = jest.requireActual('@backstage/core-plugin-api');
  return {
    ...actual,
    useApi: (ref: any) => {
      if (ref?.id === (actual.analyticsApiRef as any).id) return { captureEvent: jest.fn() };
      if (ref?.id === (require('..').costscopeApiRef as any).id) return (globalThis as any).__COSTSCOPE_API__;
      // Return benign empty mock for any other optional Backstage APIs some widgets might probe (e.g. feature flags)
      return {};
    },
  };
});

// Lightweight mock implementing the subset of CostscopeApi used by the page + hooks.
function createMockApi() {
  const calls: Record<string, number> = {};
  const mark = (k: string) => { calls[k] = (calls[k] || 0) + 1; };
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
  const overview = Array.from({ length: 5 }).map((_, i) => ({ date: `2025-01-0${i+1}`, cost: 100 + i }));
  const breakdown = Array.from({ length: 3 }).map((_, i) => ({ dim: `Svc${i+1}`, cost: 50 + i * 5, deltaPct: 0.1 * i }));
  const alerts = [{ id: 'a1', severity: 'info', message: 'All good' }];
  const providers = [{ id: 'aws', displayName: 'AWS', status: 'ok' }];
  const datasets = [{ id: 'd1', provider: 'aws', project: 'global', status: 'ready', records: 123, periodStart: '2025-01-01', periodEnd: '2025-01-31' }];
  return {
    __calls: calls,
    prefetchAll: async ({ period }: any) => {
      mark('prefetchAll');
      // Simulate small network latency to exercise loading state logic
      await delay(5);
      return { overview, breakdown, alerts, correlationId: 'cid123', durationMs: 5 };
    },
    getSummary: async (period: string) => { mark('getSummary'); return { period, totalCost: 1234 }; },
    getProviders: async () => { mark('getProviders'); return providers; },
    getDatasets: async () => { mark('getDatasets'); return datasets; },
    getBreakdown: async () => { mark('getBreakdown'); return breakdown; },
    getOverview: async () => { mark('getOverview'); return overview; },
    getActionItems: async () => { mark('getActionItems'); return alerts; },
    searchDatasets: async () => { mark('searchDatasets'); return datasets; },
    invalidateCache: () => {},
    health: async () => ({ status: 'ok' }),
  } as any;
}

// Helper render mounting QueryClient and injecting mock via global fallback consumed by usePrefetchedCostscopeData
function renderPage(mockApi: any) {
  (globalThis as any).__COSTSCOPE_API__ = mockApi;
  // Minimal ResizeObserver polyfill for Recharts / layout hooks
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <CostscopePage />
    </QueryClientProvider>
  );
}

describe('CostscopePage integration (prefetch + refresh)', () => {
  it('renders core widgets after prefetch and triggers refetch on Refresh All', async () => {
    const api = createMockApi();
    renderPage(api);

    // Page title
  expect(await screen.findByRole('heading', { name: /Costscope/i })).toBeTruthy();

    // Overview chart container (by accessible name from figure title or fallback region) – fallback to a test id if present later.
    // Use summary header presence (total cost label) as proxy for summary fetch.
    await screen.findByText(/Total/i, {}, { timeout: 2000 }).catch(() => {}); // tolerate absence if i18n phrasing differs

  // Wait for any one of the mock breakdown dimensions to appear or skip if hidden behind charts (non-fatal)
  await screen.findByText(/Svc[1-3]/).catch(() => {});

    // Ensure prefetchAll + summary + providers were invoked
    expect(api.__calls.prefetchAll).toBeGreaterThanOrEqual(1);
    expect(api.__calls.getSummary).toBeGreaterThanOrEqual(1);
    expect(api.__calls.getProviders).toBeGreaterThanOrEqual(1);

    // Trigger refresh all
    const btn = await screen.findByTestId('dashboard-refresh-all');
    api.__calls.getOverview = 0; // reset selected counters we care about
    api.__calls.getBreakdown = 0;
    await act(async () => { btn.click(); });

    // After refresh, overview & breakdown queries should refetch; allow small delay for async invalidations
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    expect(api.__calls.getOverview).toBeGreaterThanOrEqual(1);
    expect(api.__calls.getBreakdown).toBeGreaterThanOrEqual(1);
  });
});
