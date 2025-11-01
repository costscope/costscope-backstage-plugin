import React from 'react';
// Mock Backstage core plugin API so useApi(costscopeApiRef) resolves to our injected mock
jest.mock('@backstage/core-plugin-api', () => {
  const actual = jest.requireActual('@backstage/core-plugin-api');
  return {
    ...actual,
    useApi: (ref: any) => {
      if (ref?.id === 'plugin.costscope.service') return (globalThis as any).__COSTSCOPE_MOCK_API__;
      if (ref?.id === 'core.featureFlags')
        return { isActive: (n: string) => !!(globalThis as any).__COSTSCOPE_FLAGS__?.[n] };
      return {} as any;
    },
  };
});
import userEvent from '@testing-library/user-event';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { renderWithProviders } from '../testing/utils/renderWithProviders';
import { SummaryCard } from '../components/widgets/cards/SummaryCard';

describe('SummaryCard unit tests', () => {
  it('renders nodata when getSummary returns null', async () => {
    const mockApi = { getSummary: async () => null } as any;
    // Pass mockApi into renderWithProviders so it is merged into the wrapper mock
    renderWithProviders(<SummaryCard period="P7D" />, { mockApi });
    // wait for loading skeleton to disappear to avoid racing assertions on Node 20
    await waitForElementToBeRemoved(() => screen.getByTestId('summary-skeleton'));
    // nodata message should appear (target the message to avoid multiple-match on title)
    await screen.findByText(/no data for selected period/i);
  });

  it('calls refresh with refresh flag when refresh icon clicked', async () => {
    const getSummary = jest
      .fn()
      // initial load -> no data
      .mockResolvedValueOnce(null as any)
      // refresh load -> data
      .mockResolvedValueOnce({ period: 'P7D', totalCost: 42, prevPeriodCost: 40, deltaPct: -0.05, currency: 'USD' } as any);

    // Render with the mock that initially returns null; pass mock into wrapper so it merges
    renderWithProviders(<SummaryCard period="P7D" />, { mockApi: { getSummary } });

  // Ensure initial state shows nodata message (after skeleton disappears)
  await waitForElementToBeRemoved(() => screen.getByTestId('summary-skeleton'));
  await screen.findByText(/no data for selected period/i);

  // Click the refresh button (icon button)
  const btn = screen.getByRole('button', { name: /refresh/i });
  await userEvent.click(btn);

  // We expect two calls: initial + refresh
  await waitFor(() => expect(getSummary).toHaveBeenCalledTimes(2));
  // Second call should include refresh flag
  expect(getSummary.mock.calls[1][1]).toEqual(expect.objectContaining({ refresh: true }));
  // Data should now be rendered (look for 42 ignoring formatting artifacts)
  await screen.findByText(/42/);
  expect(screen.queryByText(/no data for selected period/i)).toBeNull();
  });
});
