import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
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
import { renderWithProviders } from '../testing/utils/renderWithProviders';
import { SummaryCard } from '../components/widgets/cards/SummaryCard';

describe('SummaryCard behavior', () => {
  it('calls getSummary with refresh:true when clicking refresh', async () => {
    const mockGetSummary = jest.fn().mockResolvedValue({ period: 'P7D', totalCost: 10, prevPeriodCost: 5, deltaPct: -0.2, currency: 'USD' });
    const { container, findByText } = renderWithProviders(<SummaryCard period="P7D" />, { mockApi: { getSummary: mockGetSummary } });

    // Wait for the card to render
    await findByText('Summary');

    // Find the icon button (it uses an aria-label)
    const btn = container.querySelector('button[aria-label]') as HTMLButtonElement | null;
    expect(btn).toBeTruthy();

    if (btn) {
      fireEvent.click(btn);
    }

    await waitFor(() => {
      // Ensure at least one call included the refresh flag
      const hadRefresh = mockGetSummary.mock.calls.some((c: any[]) => c[1] && c[1].refresh === true);
      expect(hadRefresh).toBe(true);
    });
  });
});
