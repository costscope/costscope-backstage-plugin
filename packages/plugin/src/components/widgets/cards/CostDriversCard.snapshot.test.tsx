import React from 'react';
import { CostDriversCard } from './CostDriversCard';
// Mock Backstage useApi similar to other widget tests so the component can resolve costscopeApiRef
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
import { renderWithProviders } from '../../../testing/utils/renderWithProviders';

describe('CostDriversCard', () => {
  it('renders data', async () => {
    const { findByText, container } = renderWithProviders(<CostDriversCard period="P7D" />, {
      mockApi: {
        getBreakdown: async () => [
          { dim: 'Compute', cost: 1000, deltaPct: 0.1 },
          { dim: 'Storage', cost: 500, deltaPct: -0.05 },
        ],
      },
    });
    await findByText(/Compute/);
    expect(container).toMatchSnapshot();
  });

  it('renders empty state', async () => {
    const { findByText, container } = renderWithProviders(<CostDriversCard period="P7D" />, {
      mockApi: { getBreakdown: async () => [] },
    });
    await findByText(/No cost drivers/);
    expect(container).toMatchSnapshot();
  });

  it('renders error', async () => {
    const { findByText, container } = renderWithProviders(<CostDriversCard period="P7D" />, {
      mockApi: { getBreakdown: async () => { throw Object.assign(new Error('x'), { correlationId: 'corr-1' }); } },
    });
    await findByText(/Failed to load cost drivers/);
    expect(container).toMatchSnapshot();
  });
});
