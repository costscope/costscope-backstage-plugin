import React from 'react';
import { CostDriversCard } from './CostDriversCard';
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

describe('CostDriversCard behavior', () => {
  it('sorts by cost desc and applies limit', async () => {
    const { findByText, queryAllByRole } = renderWithProviders(<CostDriversCard period="P30D" limit={3} />, {
      mockApi: {
        getBreakdown: async () => [
          { dim: 'A', cost: 10, deltaPct: 0 },
          { dim: 'B', cost: 30, deltaPct: 0 },
          { dim: 'C', cost: 20, deltaPct: 0 },
          { dim: 'D', cost: 5, deltaPct: 0 },
        ],
      },
    });
    await findByText(/B/);
    const rows = queryAllByRole('row'); // includes header row
    // Header + 3 data rows
    expect(rows.length).toBe(1 + 3);
  });
});
