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

// Mock complex Backstage layout & heavy chart internals to keep DOM small & deterministic for axe
jest.mock('@backstage/core-components', () => ({
  Page: ({ children }: any) => <div data-mock="Page">{children}</div>,
  Header: ({ title }: any) => <h1>{title}</h1>,
  Content: ({ children }: any) => <main>{children}</main>,
  InfoCard: ({ title, children }: any) => (
    <section aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

// Simplify chart to static figure
jest.mock('../widgets/charts/CostOverviewCard', () => ({
  CostOverviewCard: () => (
    <div role="region" aria-labelledby="costscope-30day-overview-heading">
      <h2 id="costscope-30day-overview-heading">30 Day Cost Overview</h2>
      <p>Chart placeholder</p>
    </div>
  ),
}));
// Mock summary as an h2 to preserve heading order in this focused a11y test
// Mock new composite summary header (CostSummaryHeader) to simple markup
jest.mock('../widgets/cards/CostSummaryHeader', () => ({
  CostSummaryHeader: () => (
    <section aria-labelledby="sumh"><h2 id="sumh">Summary & Top Services</h2><div>Total: $0</div></section>
  ),
}));

// Keep old SummaryCard mock (still imported indirectly in some snapshots) minimal

jest.mock('../widgets/panels/ActionItemsPanel', () => ({
  ActionItemsPanel: () => (
    <section aria-labelledby="aipanel"><h2 id="aipanel">Action Items</h2><ul><li>No items</li></ul></section>
  ),
}));

jest.mock('../../features/costs/tables/BreakdownTable', () => ({
  BreakdownTable: () => (
    <div role="region" aria-labelledby="bdheading">
      <h2 id="bdheading">ServiceCategory Breakdown</h2>
      <table aria-label="ServiceCategory cost breakdown table"><thead><tr><th>ServiceCategory</th><th>Cost</th><th>Δ %</th></tr></thead><tbody><tr><td>Compute</td><td>$100</td><td>10%</td></tr></tbody></table>
    </div>
  ),
}));

import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { axe, toHaveNoViolations } = require('jest-axe');
expect.extend(toHaveNoViolations);

// Augment jest matcher types locally for TS (test scope only)
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}
import { renderWithProviders } from '../../testing/utils/renderWithProviders';
import { CostscopePage } from './CostscopePage';

describe('CostscopePage accessibility', () => {
  it('no violations in typical loaded state', async () => {
    const { container, findByText } = renderWithProviders(<CostscopePage />, {
      mockApi: {
        getOverview: async () => [{ date: '2025-01-01', cost: 100 }],
        getBreakdown: async () => [{ dim: 'Compute', cost: 100, deltaPct: 0.1 }],
        getActionItems: async () => [],
        getSummary: async (p: string) => ({ period: p, project: 'global', totalCost: 0, previousTotalCost: 0, deltaPct: 0, currency: 'USD' }),
        getProviders: async () => [{ id: 'aws', displayName: 'AWS', status: 'ok' }],
        getDatasets: async () => [{ id: 'ds1', provider: 'aws', project: 'global', periodStart: '2025-01-01', periodEnd: '2025-01-31', records: 10, status: 'ready' }],
        prefetchAll: async () => ({ overview: [], breakdown: [], alerts: [], summary: { period: 'P30D', project: 'global', totalCost: 0, previousTotalCost: 0, deltaPct: 0, currency: 'USD' } as any, providers: [], datasets: [], correlationId: 'c', durationMs: 0 }),
      },
    });
    await findByText('Costscope – Cloud Cost Overview');
    // Give microtasks time for react-query paint
    await new Promise(r => setTimeout(r, 0));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
