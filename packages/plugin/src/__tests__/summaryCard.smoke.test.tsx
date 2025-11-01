import React from 'react';
import { render, screen } from '@testing-library/react';
import { SummaryCard } from '../components/widgets/cards/SummaryCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Minimal test harness: provide QueryClient and a benign global API used by hooks
const renderWithProviders = (node: React.ReactElement) => {
  (globalThis as any).__COSTSCOPE_API__ = {};
  (globalThis as any).ResizeObserver = class { observe() {}; unobserve() {}; disconnect() {} } as any;
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
};

describe('SummaryCard smoke', () => {
  it('renders without crashing', () => {
  renderWithProviders(<SummaryCard /> as any);
  // ensure it renders either the loading skeleton or some identifiable content
  const skeleton = screen.queryByTestId('summary-skeleton');
  const content = screen.queryByText(/Summary/i) || screen.queryByRole('article') || screen.queryByTestId?.('summary-card');
  expect(skeleton || content).toBeTruthy();
  });
});
