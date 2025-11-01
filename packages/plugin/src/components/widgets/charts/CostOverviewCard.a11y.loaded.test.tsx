import React from 'react';
import { CostOverviewCard } from './CostOverviewCard';
import { renderWithProviders } from 'src/testing/utils/renderWithProviders';

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

// Lightly mock recharts primitives to keep DOM minimal while retaining figure + chart semantics
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-mock="chart-container">{children}</div>,
  ComposedChart: ({ children }: any) => <div role="img" aria-label="cost trend chart">{children}</div>,
  Line: () => <div />, Area: () => <div />, CartesianGrid: () => <div />, XAxis: () => <div />, YAxis: () => <div />, Tooltip: () => <div />, Legend: () => <div />,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { axe } = require('jest-axe');

describe('CostOverviewCard accessibility (loaded state)', () => {
  it('has no axe violations and proper figure/description wiring', async () => {
    const { container, findByText, getByRole } = renderWithProviders(<CostOverviewCard period="P30D" />, {
      mockApi: { getOverview: async () => [
        { date: '2025-08-01', cost: 100 },
        { date: '2025-08-02', cost: 120 },
      ] },
    });
    await findByText('30 Day Cost Overview');

    const region = getByRole('region');
    const labelledBy = region.getAttribute('aria-labelledby');
    expect(labelledBy).toMatch(/costscope-30day-overview-heading/);

    const figure = getByRole('figure');
    // Chart figure now uses aria-labelledby for the visible heading and aria-describedby for hidden desc
    const labelledByFig = figure.getAttribute('aria-labelledby');
    expect(labelledByFig).toMatch(/costscope-30day-overview-heading/);
    const descId = figure.getAttribute('aria-describedby');
    expect(descId).toMatch(/costscope-30day-overview-chart-desc/);
    const desc = document.getElementById(descId!);
    expect(desc?.textContent).toMatch(/Line chart showing daily total cloud cost/);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
