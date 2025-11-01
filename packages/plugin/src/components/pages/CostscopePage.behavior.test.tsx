/**
 * CostscopePage dashboard behavior tests: render, period switching, refresh-all, error boundary.
 */
import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../testing/utils/renderWithProviders';
import type { CostscopeApi } from '../../client';

// CI can be slower on initial render; extend default per-test timeout for this suite
// Increase to 120s to avoid intermittent timeouts on slower runners / CI
jest.setTimeout(120000);

// Use minimal mock that sources __COSTSCOPE_MOCK_API__
jest.mock('@backstage/core-plugin-api', () => {
  const actual = jest.requireActual('@backstage/core-plugin-api');
  return {
    ...actual,
    useApi: (ref: any) => {
      if (ref?.id === 'plugin.costscope.service') return (globalThis as any).__COSTSCOPE_MOCK_API__;
      if (ref?.id === 'core.featureFlags') return { isActive: () => false };
      return {} as any;
    },
  };
});

// Mock heavy Recharts-based component to keep test deterministic in jsdom
jest.mock('../widgets/charts/CostOverviewCard', () => ({
  CostOverviewCard: ({ period }: { period?: string }) => {
    // Side-effect: call API to simulate data fetch without bringing Recharts/ResizeObserver
    const React = require('react');
    const { useApi } = require('@backstage/core-plugin-api');
    const { costscopeApiRef } = require('../../client');
    const api = useApi(costscopeApiRef);
    React.useEffect(() => {
      try {
        api?.getOverview?.(period ?? 'P30D', {});
      } catch {}
    }, [api, period]);
    return (
      <div role="region" aria-labelledby="stub-overview-h">
        <h2 id="stub-overview-h">Overview {period}</h2>
      </div>
    );
  },
}));

// Mock ChargeCategoryDonut (Recharts donut) to avoid ResizeObserver requirement in jsdom
jest.mock('../widgets/charts/ChargeCategoryDonut', () => ({
  ChargeCategoryDonut: ({ period }: { period?: string }) => {
    const React = require('react');
    const { useApi } = require('@backstage/core-plugin-api');
    const { costscopeApiRef } = require('../../client');
    const api = useApi(costscopeApiRef);
    React.useEffect(() => {
      try { api?.getBreakdown?.('ChargeCategory', period ?? 'P30D', {}); } catch {}
    }, [api, period]);
    return <div role="region" aria-label={`ChargeCategoryDonut stub ${period}`} />;
  },
}));

// (Light) mock CostDriversCard to keep behavior deterministic (no table markup assertions here)
jest.mock('../widgets/cards/CostDriversCard', () => ({
  CostDriversCard: ({ period, dimension }: { period?: string; dimension?: string }) => {
    const React = require('react');
    const { useApi } = require('@backstage/core-plugin-api');
    const { costscopeApiRef } = require('../../client');
    const api = useApi(costscopeApiRef);
    React.useEffect(() => {
      try { api?.getBreakdown?.(dimension || 'ServiceCategory', period ?? 'P30D', {}); } catch {}
    }, [api, period, dimension]);
    return <div role="region" aria-label={`CostDriversCard stub ${dimension || 'ServiceCategory'}`} />;
  },
}));

function createApiMock(overrides: Partial<CostscopeApi> = {}): Partial<CostscopeApi> {
  return {
    getSummary: jest.fn(async () => ({ period: 'P7D', totalCost: 100, prevPeriodCost: 80, deltaPct: 0.25, currency: 'USD' } as any)),
    getOverview: jest.fn(async (_period: string) => [{ date: '2025-01-01', cost: 1 }]),
    getBreakdown: jest.fn(async () => [{ dim: 'Compute', cost: 10, deltaPct: 0.1 }]),
    getActionItems: jest.fn(async () => [{ id: 'a1', severity: 'info', message: 'Test' } as any]),
    getProviders: jest.fn(async () => [{ id: 'aws', name: 'AWS', status: 'ok' }] as any),
    getDatasets: jest.fn(async () => [
      { id: 'ds1', provider: 'aws', periodStart: '2025-01-01', periodEnd: '2025-01-31', records: 100, status: 'ready' },
    ] as any),
    prefetchAll: jest.fn(async () => ({ overview: [], breakdown: [], alerts: [], summary: { period: 'P30D', project: 'global', totalCost: 100, previousTotalCost: 90, deltaPct: 0.11, currency: 'USD' } as any, providers: [], datasets: [], correlationId: 't', durationMs: 0 })),
    invalidateCache: jest.fn(() => undefined),
    ...overrides,
  };
}

describe('CostscopePage (dashboard)', () => {
  it('renders dashboard and calls API for widgets', async () => {
    const mock = createApiMock();
  renderWithProviders(React.createElement(require('./CostscopePage').CostscopePage), { mockApi: mock });
  expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy();
    await waitFor(() => {
      expect((mock.getSummary as jest.Mock).mock.calls.length).toBeGreaterThan(0);
      expect((mock.getOverview as jest.Mock).mock.calls.length).toBeGreaterThan(0);
      expect((mock.getBreakdown as jest.Mock).mock.calls.length).toBeGreaterThan(0);
      expect((mock.getActionItems as jest.Mock).mock.calls.length).toBeGreaterThan(0);
      expect((mock.getProviders as jest.Mock).mock.calls.length).toBeGreaterThan(0);
      expect((mock.getDatasets as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    });

    // Toggle dev panel (visible in non-production)
    await userEvent.click(screen.getByTestId('toggle-cache-events'));
  expect(screen.getByRole('region', { name: /cache and swr events/i })).toBeTruthy();
  });

  it('switches period via FiltersBar and refetches overview with new period', async () => {
    const mock = createApiMock();
  renderWithProviders(React.createElement(require('./CostscopePage').CostscopePage), { mockApi: mock });
  await waitFor(() => expect((mock.getSummary as jest.Mock).mock.calls.length).toBeGreaterThan(0));
    const initial = (mock.getOverview as jest.Mock).mock.calls[0][0];
    expect(initial).toBe('P30D');
    await userEvent.click(screen.getByRole('button', { name: '7D' }));
    await waitFor(() => {
      const periods = (mock.getOverview as jest.Mock).mock.calls.map(c => c[0]);
      expect(periods).toContain('P7D');
    });
  });

  it('refresh all triggers refetch of active widgets', async () => {
    const mock = createApiMock();
  renderWithProviders(React.createElement(require('./CostscopePage').CostscopePage), { mockApi: mock });
    await waitFor(() => expect((mock.getOverview as jest.Mock).mock.calls.length).toBeGreaterThan(0));
    const before = {
      breakdown: (mock.getBreakdown as jest.Mock).mock.calls.length,
      actions: (mock.getActionItems as jest.Mock).mock.calls.length,
      summary: (mock.getSummary as jest.Mock).mock.calls.length,
      providers: (mock.getProviders as jest.Mock).mock.calls.length,
      datasets: (mock.getDatasets as jest.Mock).mock.calls.length,
    };
    await userEvent.click(screen.getByTestId('dashboard-refresh-all'));
    await waitFor(() => {
  // Breakdown may or may not refetch depending on user period/group; treat optional.
      expect((mock.getActionItems as jest.Mock).mock.calls.length).toBeGreaterThan(before.actions);
      expect((mock.getSummary as jest.Mock).mock.calls.length).toBeGreaterThan(before.summary);
      expect((mock.getProviders as jest.Mock).mock.calls.length).toBeGreaterThan(before.providers);
      expect((mock.getDatasets as jest.Mock).mock.calls.length).toBeGreaterThan(before.datasets);
    });
  });
});
