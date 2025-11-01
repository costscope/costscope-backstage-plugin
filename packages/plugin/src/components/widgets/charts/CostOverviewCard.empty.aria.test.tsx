import React from 'react';
import { CostOverviewCard } from './CostOverviewCard';
import { renderWithProviders } from 'src/testing/utils/renderWithProviders';

jest.mock('@backstage/core-plugin-api', () => {
  const actual = jest.requireActual('@backstage/core-plugin-api');
  return {
    ...actual,
    useApi: (ref: any) => {
      if (ref?.id === 'plugin.costscope.service') return (globalThis as any).__COSTSCOPE_MOCK_API__;
      if (ref?.id === 'core.featureFlags') return { isActive: (n: string) => !!(globalThis as any).__COSTSCOPE_FLAGS__?.[n] };
      return {} as any;
    },
  };
});

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-mock="chart">{children}</div>,
  ComposedChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  Area: () => <div />,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

describe('CostOverviewCard empty state accessibility', () => {
  it('renders empty (no data) state with correct ARIA wiring', async () => {
    const { container, findByText, getByRole, queryByRole } = renderWithProviders(<CostOverviewCard />, {
      mockApi: { getOverview: async () => [] },
    });

    await findByText('No data for selected period');

    const region = getByRole('region');
    expect(region).toBeTruthy();
    const labelledBy = region.getAttribute('aria-labelledby');
    expect(labelledBy).toMatch(/^costscope-30day-overview-heading$/);

    const heading = document.getElementById(labelledBy!);
    expect(heading).not.toBeNull();
    expect(heading?.textContent?.replace(/\s+/g, ' ').trim()).toBe('30 Day Cost Overview');

    const refreshBtn = getByRole('button', { name: /refresh 30 day cost overview data/i });
    expect(refreshBtn).toBeTruthy();

    expect(queryByRole('figure')).toBeNull();

    expect(container.firstChild).toMatchSnapshot();
  });
});
