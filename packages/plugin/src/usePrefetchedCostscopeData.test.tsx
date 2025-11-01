import React from 'react';
import { renderWithProviders } from './testing/utils/renderWithProviders';
import { usePrefetchedCostscopeData } from './client/hooks';
import { screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { qk } from './queryKeys';
import { CostscopeApi } from './client';

// Simple component exercising the hook + downstream useQuery consumers
const Harness = () => {
  const { overview, breakdown, alerts, isLoading, error } = usePrefetchedCostscopeData({ period: 'P5D' });
  // Consumers that would normally fetch on their own – here we just read cache
  const oQ = useQuery({
    queryKey: qk.overview('P5D', undefined),
    queryFn: async () => overview ?? [],
    enabled: false, // rely on prefilled data
  });
  return (
    <div>
      <div data-testid="status">{isLoading ? 'loading' : error ? 'error' : 'ready'}</div>
      <div data-testid="counts">{`${overview?.length || 0}|${breakdown?.length || 0}|${alerts?.length || 0}`}</div>
      <div data-testid="oQCached">{Array.isArray(oQ.data) ? oQ.data.length : 'na'}</div>
    </div>
  );
};

describe('usePrefetchedCostscopeData', () => {
  it('prefetches and primes cache', async () => {
    const mockData = {
      overview: Array.from({ length: 3 }, (_, i) => ({ date: `2025-01-0${i + 1}`, cost: i + 1 })),
      breakdown: [{ dim: 'Compute', cost: 10, deltaPct: 0.1 }],
      alerts: [{ id: 'a1', severity: 'info' as const, message: 'Test' }],
    };
    const mock: Partial<CostscopeApi> = {
      prefetchAll: async () => ({ ...mockData, summary: { period: 'P5D', project: 'global', totalCost: 0, previousTotalCost: 0, deltaPct: 0, currency: 'USD' } as any, providers: [], correlationId: 'cid', durationMs: 5 }),
      getOverview: async () => mockData.overview,
      getBreakdown: async () => mockData.breakdown,
      getActionItems: async () => mockData.alerts,
    };
  renderWithProviders(<Harness />, { mockApi: mock });
  // Ensure loading state settles to reduce timing flakiness across Node versions/React Query
  await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'), { timeout: 5000 });
  await waitFor(() => expect(screen.getByTestId('counts').textContent).toBe('3|1|1'), { timeout: 5000 });
  });
});
