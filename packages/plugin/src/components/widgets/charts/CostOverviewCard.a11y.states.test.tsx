import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { axe } = require('jest-axe');
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

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-mock="chart">{children}</div>,
  ComposedChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />, Area: () => <div />, CartesianGrid: () => <div />, XAxis: () => <div />, YAxis: () => <div />, Tooltip: () => <div />, Legend: () => <div />,
}));

describe('CostOverviewCard accessibility (skeleton + error)', () => {
  it('skeleton state has no axe violations', async () => {
    const never = new Promise<any>(() => {});
    const { container, getByTestId } = renderWithProviders(<CostOverviewCard period="P30D" />, {
      mockApi: { getOverview: async () => (await never) },
    });
    expect(getByTestId('cost-overview-skeleton')).toBeTruthy();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('error state has no axe violations', async () => {
    const { container, findByText } = renderWithProviders(<CostOverviewCard period="P30D" />, {
      mockApi: { getOverview: async () => { throw Object.assign(new Error('BoomErr'), { correlationId: 'cid-ovx' }); } },
    });
    await findByText('Failed to load data. Please retry.');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
