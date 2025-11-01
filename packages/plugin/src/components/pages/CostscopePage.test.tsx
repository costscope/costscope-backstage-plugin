import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../testing/utils/renderWithProviders';

// Minimal mock for usePrefetchedCostscopeData hook; preserve rest of hooks (useClientStaleTime, etc.)
jest.mock('../../client/hooks', () => {
  const actual = jest.requireActual('../../client/hooks');
  return {
    ...actual,
    usePrefetchedCostscopeData: () => ({
      overview: [],
      breakdown: [],
      alerts: [],
      correlationId: 'test-corr',
      durationMs: 1,
      isLoading: false,
      error: undefined,
      refresh: jest.fn(),
    }),
  };
});

// Light mocks: just reduce noise for a few heavier components; others left real
jest.mock('../widgets/charts/CostOverviewCard', () => ({
  CostOverviewCard: () => {
    if (process.env.TEST_FORCE_WIDGET_ERROR) {
      throw new Error('Boom');
    }
    return <div data-testid="overview-chart" />;
  },
}));
jest.mock('../widgets/cards/CostSummaryHeader', () => ({ CostSummaryHeader: () => <div data-testid="summary-header" /> }));

// Mock i18n to return key => simplified English
jest.mock('../../i18n', () => {
  const actual = jest.requireActual('../../i18n');
  return {
    ...actual,
    I18nProvider: ({ children }: any) => <>{children}</>,
    useI18n: () => ({ t: (k: string) => ({ 'page.title': 'Costscope', 'page.refreshAll': 'Refresh All', 'error.card.title': 'Error', 'error.generic': 'Error occurred', 'error.reload': 'Reload' }[k] || k) }),
  };
});

// Mock analytics useApi calls gracefully
jest.mock('@backstage/core-plugin-api', () => {
  const real = jest.requireActual('@backstage/core-plugin-api');
  return {
    ...real,
    useApi: () => ({ captureEvent: jest.fn() }),
  };
});

// NOTE: This file is retained for historical reference but now skipped because
// comprehensive behavior, a11y, and error boundary coverage lives in:
//  - CostscopePage.behavior.test.tsx
//  - CostscopePage.errorboundary.test.tsx
//  - CostscopePage.a11y.test.tsx
// Keeping these tests active caused intermittent timeouts (duplicate rendering + mocks).
// If reintroducing targeted unit wiring tests, remove .skip and ensure they add unique value.
describe.skip('CostscopePage (unit wiring)', () => {
  it('legacy wiring test (skipped)', async () => {
    /* intentionally skipped */
  });
  it('legacy error boundary test (skipped)', async () => {
    /* intentionally skipped */
  });
});
