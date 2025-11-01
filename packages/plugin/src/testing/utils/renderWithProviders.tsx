import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { CostscopeApi } from '../../client';
import { FormattingProvider } from '../../formatting';
import { I18nProvider } from '../../i18n';

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#7c3699' }, secondary: { main: '#4181f4' } },
});

export function renderWithProviders(
  ui: React.ReactElement,
  opts?: { mockApi?: Partial<CostscopeApi>; featureFlags?: Record<string, boolean> },
): ReturnType<typeof render> {
  // In CI/jsdom, focus/online detection can pause queries under some Node versions.
  // Force networkMode 'always' and disable focus/refetch side effects so data fetching
  // is deterministic in tests across Node 20/22.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        networkMode: 'always',
      },
    },
  });
  const mock: CostscopeApi = {
    getOverview: async () => [],
    getBreakdown: async () => [],
    getActionItems: async () => [],
	getSummary: async () => ({ period: 'P30D', totalCost: 0, prevPeriodCost: 0, deltaPct: 0, currency: 'USD' } as any),
  getProviders: async () => [],
  getDatasets: async () => [],
  searchDatasets: async () => [],
  health: async () => ({ status: 'ok' }) as any,
  prefetchAll: async () => ({ overview: [], breakdown: [], alerts: [], summary: { period: 'P30D', project: 'global', totalCost: 0, previousTotalCost: 0, deltaPct: 0, currency: 'USD' } as any, providers: [], correlationId: 'test', durationMs: 0 }),
    invalidateCache: () => undefined,
    ...(opts?.mockApi || {}),
  };
  (globalThis as any).__COSTSCOPE_MOCK_API__ = mock;
  (globalThis as any).__COSTSCOPE_FLAGS__ = opts?.featureFlags || {};
  const Wrapper = ({ children }: PropsWithChildren<any>) => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <FormattingProvider>
          <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </FormattingProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper });
}
