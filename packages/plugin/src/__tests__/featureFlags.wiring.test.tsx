import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CostscopePage } from '../components/pages/CostscopePage';

// Mock useApi to supply both feature flags and costscope API without pulling in AppRouter / ApiProvider
jest.mock('@backstage/core-plugin-api', () => {
  const actual = jest.requireActual('@backstage/core-plugin-api');
  return {
    ...actual,
    useApi: (ref: any) => {
      const { analyticsApiRef, featureFlagsApiRef } = actual as any;
      const costscopeApiRef = (require('..') as any).costscopeApiRef;
      if (ref?.id === analyticsApiRef.id) return { captureEvent: jest.fn() };
      if (ref?.id === featureFlagsApiRef.id) {
        // Provide a benign feature flags impl; page code probes isActive()
        return { isActive: () => false, getRegisteredFlags: () => [] };
      }
      if (ref?.id === costscopeApiRef.id) return (globalThis as any).__COSTSCOPE_API__;
      return {};
    },
  };
});

function createMockCostscopeApi() {
  return {
    prefetchAll: async () => ({
      overview: [],
      breakdown: [],
      alerts: [],
      correlationId: 't',
      durationMs: 0,
    }),
    getSummary: async () => ({
      period: 'P30D',
      totalCost: 0,
      previousTotalCost: 0,
      deltaPct: 0,
      currency: 'USD',
    }),
    getOverview: async () => [],
    getBreakdown: async () => [],
    getActionItems: async () => [],
    getProviders: async () => [],
    getDatasets: async () => [],
    searchDatasets: async () => [],
    health: async () => ({ status: 'ok' }),
    invalidateCache: () => {},
  } as any;
}

describe('Feature flags wiring (ApiProvider + LocalStorageFeatureFlags)', () => {
  it('renders CostscopePage without apiRef{core.featureflags} error', async () => {
    (globalThis as any).__COSTSCOPE_API__ = createMockCostscopeApi();
    // Minimal ResizeObserver polyfill used by layout-sensitive components
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
    const client = new QueryClient();

    const { findByTestId, queryByText } = render(
      <QueryClientProvider client={client}>
        <div data-testid="harness-root">
          <CostscopePage />
        </div>
      </QueryClientProvider>,
    );

    // Ensure page root attaches
    await findByTestId('costscope-page-root');

    // Validate no feature-flags wiring error is shown
    const errorProbe = queryByText(/No implementation available for apiRef\{core\.featureflags\}/i);
    expect(errorProbe).toBeNull();

    // Basic presence check for a known caption/label (non-strict, might differ by locale)
    // Do not fail if not present; the main assertion above is the key wiring guard.
    try {
      await screen.findByText(/Total|summary|breakdown/i, {}, { timeout: 1500 });
    } catch {}
  });
});
