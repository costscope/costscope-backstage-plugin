import React from 'react';
import { render, screen } from '@testing-library/react';
import { CostscopePage } from '../components/pages/CostscopePage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const renderWithProviders = (node: React.ReactElement) => {
  (globalThis as any).__COSTSCOPE_API__ = {};
  (globalThis as any).ResizeObserver = class { observe() {}; unobserve() {}; disconnect() {} } as any;
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
};

describe('CostscopePage smoke', () => {
  it('renders without crashing', () => {
  renderWithProviders(<CostscopePage />);
    // basic smoke: check that page renders a heading or main element
    const main = screen.queryByRole('main') || screen.queryByText(/Costscope/i);
    expect(main).not.toBeNull();
  });
});
