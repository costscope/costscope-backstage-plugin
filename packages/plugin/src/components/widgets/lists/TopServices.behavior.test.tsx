import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { TopServices } from './TopServices';
jest.mock('@backstage/core-plugin-api', () => {
  const actual = jest.requireActual('@backstage/core-plugin-api');
  return {
    ...actual,
    useApi: (ref: any) => {
      if (ref?.id === 'plugin.costscope.service') return (globalThis as any).__COSTSCOPE_MOCK_API__;
      if (ref?.id === 'core.featureFlags') return { isActive: (n: string) => !!(globalThis as any).__COSTSCOPE_FLAGS__?.[n] };
      if (ref?.id === 'core.analytics') return { captureEvent: jest.fn() };
      return {} as any;
    },
  };
});
import { renderWithProviders } from 'src/testing/utils/renderWithProviders';

describe('TopServices behavior', () => {
  it('limits items and refresh triggers refetch', async () => {
    const mock = {
      calls: 0,
      async getBreakdown() {
        this.calls += 1;
        return [
          { dim: 'A', cost: 10, deltaPct: 0.1 },
          { dim: 'B', cost: 9, deltaPct: 0.0 },
          { dim: 'C', cost: 8, deltaPct: -0.2 },
        ];
      },
    };

    const { findByText, getByTestId } = renderWithProviders(<TopServices limit={2} />, {
      mockApi: mock as any,
    });

    await findByText('A'); // top item appears
    // Limit=2 -> should not render third item 'C'
    expect(() => getByTestId('service-C')).toThrow();

    // Trigger refresh
    fireEvent.click(getByTestId('top-services-refresh'));

    await waitFor(() => {
      const api = (globalThis as any).__COSTSCOPE_MOCK_API__;
      expect(api.calls).toBeGreaterThan(1);
    });
  });
});
