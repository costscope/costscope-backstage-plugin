import React from 'react';
import { ChargeCategoryDonut } from './ChargeCategoryDonut';
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
// Light recharts mock to keep DOM minimal & deterministic
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-mock="chart">{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Tooltip: () => <div />,
  Legend: () => <div />,
  Cell: () => <div />,
}));
import { renderWithProviders } from '../../../testing/utils/renderWithProviders';
import { screen, waitFor } from '@testing-library/react';

describe('ChargeCategoryDonut', () => {
  it('renders loading', () => {
    const { getByTestId } = renderWithProviders(<ChargeCategoryDonut />, {
      mockApi: { getBreakdown: async () => new Promise(() => {}) },
    });
    expect(getByTestId('charge-donut-skeleton')).toBeTruthy();
  });
  it('renders data', async () => {
    const { container } = renderWithProviders(<ChargeCategoryDonut />, {
      mockApi: { getBreakdown: async (g: string) => g === 'ChargeCategory' ? [
        { dim: 'Compute', cost: 100, deltaPct: 0.1 },
        { dim: 'Storage', cost: 80, deltaPct: -0.05 },
      ] : [] },
    });
    // Wait for loading skeleton to disappear before asserting content
    await waitFor(() => expect(screen.queryByTestId('charge-donut-skeleton')).toBeNull());
    // Assert on heading text presence (i18n key resolves to 'Charge Categories')
    await screen.findByText(/Charge Categories/);
    expect(container.firstChild).toMatchSnapshot();
  });
  it('renders error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container, findByText } = renderWithProviders(<ChargeCategoryDonut />, {
      mockApi: { getBreakdown: async () => { throw new Error('Boom'); } },
    });
    await findByText('Failed to load charge categories.');
    expect(container.firstChild).toMatchSnapshot();
    spy.mockRestore();
  });
  it('renders empty', async () => {
    const { container, findByText } = renderWithProviders(<ChargeCategoryDonut />, {
      mockApi: { getBreakdown: async () => [] },
    });
    await findByText('No charge categories for selected period');
    expect(container.firstChild).toMatchSnapshot();
  });
});
