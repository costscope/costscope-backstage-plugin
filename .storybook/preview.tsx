import React from 'react';
import type { Preview } from '@storybook/react-webpack5';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiProvider } from '@backstage/core-app-api';
import {
  featureFlagsApiRef,
  FeatureFlagsApi,
  alertApiRef,
  AlertApi,
} from '@backstage/core-plugin-api';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ApiHolder } from '@backstage/core-plugin-api';
import { highContrastTheme } from '../packages/plugin/src/testing/highContrastTheme';
import { FormattingProvider } from '../packages/plugin/src/formatting';
import { costscopeApiRef, type CostscopeApi } from '../packages/plugin/src/client';
import { createMockCostscopeApi } from '../packages/plugin/src/testing/costscopeClientMock';

function buildApis(partial?: Partial<CostscopeApi>, flags?: Record<string, boolean>) {
  const mock: CostscopeApi = createMockCostscopeApi(partial);
  const featureFlags: FeatureFlagsApi = {
    getRegisteredFlags: () =>
      Object.entries(flags || {}).map(([name]) => ({ name, pluginId: 'costscope' })),
    isActive: (flag: string) => !!flags?.[flag],
    registerFlag: () => {
      /* no-op for mock */
    },
  } as any;
  // Suppress toasts globally in Storybook: provide a no-op AlertApi.
  const alertApi: AlertApi = { post: () => undefined } as any;
  return [
    [costscopeApiRef, mock],
    [featureFlagsApiRef, featureFlags],
    [alertApiRef, alertApi],
  ] as const;
}

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    chromatic: {
      // Try to reduce snapshot diffs due to animations/transitions
      pauseAnimationAtEnd: true,
    },
  },
  decorators: [
    (Story, ctx) => {
      // Fresh QueryClient per story render to isolate cache/state across stories
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const apis = buildApis(
        ctx.parameters.mockApi as Partial<CostscopeApi> | undefined,
        ctx.parameters.featureFlags as Record<string, boolean> | undefined,
      );
      const defaultTheme = createTheme({
        palette: { mode: 'light', primary: { main: '#7c3699' } },
      });
      const useHighContrast = !!(ctx.parameters as any)?.highContrast;
      const theme = useHighContrast ? highContrastTheme : defaultTheme;
      // Build a tiny ApiHolder compatible object to ensure downstream hooks receive
      // an object with a .get(ref) method regardless of Storybook bundling quirks.
      const apiMap = new Map(apis as any);
      const apiHolder: ApiHolder = { get: (ref: any) => apiMap.get(ref) } as any;
      return (
        <ApiProvider apis={apiHolder}>
          <QueryClientProvider client={queryClient}>
            <FormattingProvider>
              <ThemeProvider theme={theme}>
                <Story />
              </ThemeProvider>
            </FormattingProvider>
          </QueryClientProvider>
        </ApiProvider>
      );
    },
  ],
};

export default preview;
