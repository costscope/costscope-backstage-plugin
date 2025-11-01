import React from 'react';
jest.mock('@backstage/core-plugin-api', () => {
  const actual = jest.requireActual('@backstage/core-plugin-api');
  return {
    ...actual,
    useApi: (ref: any) => {
      if (ref?.id === 'plugin.costscope.service') return (globalThis as any).__COSTSCOPE_MOCK_API__;
      return {} as any;
    },
  };
});
import { renderWithProviders } from '../../../testing/utils/renderWithProviders';
import { CostSummaryHeader } from './CostSummaryHeader';

describe('CostSummaryHeader', () => {
  it('renders loading', () => {
    const { getByTestId } = renderWithProviders(<CostSummaryHeader period="P7D" />, {
      mockApi: { getSummary: async () => new Promise(() => {}), getBreakdown: async () => new Promise(() => {}) },
    });
    expect(getByTestId('cost-summary-header-skeleton')).toBeTruthy();
  });

  it('renders data', async () => {
    const { findByTestId, findByText, container } = renderWithProviders(<CostSummaryHeader period="P7D" />, {
      mockApi: {
        getSummary: async (p: string) => ({ period: p, project: 'global', totalCost: 1000, previousTotalCost: 900, prevPeriodCost: 900, deltaPct: 0.111, avgDailyCost: 142.857, currency: 'USD' } as any),
        getBreakdown: async () => [
          { dim: 'Compute', cost: 400, deltaPct: 0.2 },
          { dim: 'Storage', cost: 300, deltaPct: 0.1 },
          { dim: 'Network', cost: 200, deltaPct: -0.05 },
          { dim: 'Other', cost: 100, deltaPct: 0 },
        ],
      },
    });
    await findByTestId('cost-summary-header-skeleton');
    // Wait for any content
    await findByText(/summary/i);
    await findByText('Compute');
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { findByTestId, findByText, container } = renderWithProviders(<CostSummaryHeader period="P7D" />, {
      mockApi: { getSummary: async () => { throw new Error('boom'); }, getBreakdown: async () => [] },
    });
    await findByTestId('cost-summary-header-skeleton');
    await findByText(/failed to load/i);
    expect(container.firstChild).toMatchSnapshot();
    spy.mockRestore();
  });

  it('renders empty breakdown gracefully', async () => {
    const { findByTestId, findByText, container } = renderWithProviders(<CostSummaryHeader period="P7D" />, {
      mockApi: { getSummary: async (p: string) => ({ period: p, project: 'global', totalCost: 0, previousTotalCost: 0, prevPeriodCost: 0, deltaPct: 0, avgDailyCost: 0, currency: 'USD' } as any), getBreakdown: async () => [] },
    });
    await findByTestId('cost-summary-header-skeleton');
    await findByText(/summary/i);
    expect(container.firstChild).toMatchSnapshot();
  });
});
