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

// Extend default jest timeout for this file; some environments are slow and the
// test that verifies the error boundary can take longer than Jest's default
// 5s timeout.
jest.setTimeout(120000);

// Mock layout components since full Backstage app shell isn't present in unit tests
jest.mock('@backstage/core-components', () => ({
  Page: ({ children }: any) => <div data-mock="Page">{children}</div>,
  Header: ({ title }: any) => <div data-mock="Header">{title}</div>,
  Content: ({ children }: any) => <div data-mock="Content">{children}</div>,
  InfoCard: ({ title, children, ...rest }: any) => (
    <div data-mock="InfoCard" {...rest}>
      <h3>{title}</h3>
      {children}
    </div>
  ),
}));

// Force the CostOverviewCard (first large widget) to throw during render
jest.mock('../widgets/charts/CostOverviewCard', () => ({
  CostOverviewCard: () => {
    throw new Error('BoomErrorBoundary');
  },
}));

import React from 'react';
import { CostscopePage } from './CostscopePage';
import { renderWithProviders } from 'src/testing/utils/renderWithProviders';

describe('CostscopePage LocalErrorBoundary', () => {
  it('shows fallback when a child throws', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const { findByTestId, findByText } = renderWithProviders(<CostscopePage />);
    const fallback = await findByTestId('costscope-error-fallback');
    expect(fallback).toBeTruthy();
    await findByText('Reload');
    spy.mockRestore();
  });
});
