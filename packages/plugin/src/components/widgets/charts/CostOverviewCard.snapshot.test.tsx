import React from 'react';
import { CostOverviewCard } from './CostOverviewCard';
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
import { renderWithProviders } from 'src/testing/utils/renderWithProviders';

describe('CostOverviewCard snapshots', () => {
  it('renders loading skeleton', () => {
    const { getByTestId } = renderWithProviders(<CostOverviewCard />, {
      mockApi: { getOverview: async () => new Promise(() => {}) },
    });
    expect(getByTestId('cost-overview-skeleton')).toBeTruthy();
  });

  it('renders data state', async () => {
    const { container, findByText } = renderWithProviders(<CostOverviewCard />, {
      mockApi: { getOverview: async () => [
        { date: '2025-08-01', cost: 100 },
        { date: '2025-08-02', cost: 120 },
      ] },
    });
    await findByText('30 Day Cost Overview');
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders error state', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container, findByText } = renderWithProviders(<CostOverviewCard />, {
      mockApi: { getOverview: async () => { throw new Error('Boom'); } },
    });
    await findByText('Failed to load data. Please retry.');
    expect(container.firstChild).toMatchSnapshot();
    spy.mockRestore();
  });

  it('renders empty state', async () => {
    const { container, findByText } = renderWithProviders(<CostOverviewCard />, {
      mockApi: { getOverview: async () => [] },
    });
    await findByText('No data for selected period');
    expect(container.firstChild).toMatchSnapshot();
  });
});
