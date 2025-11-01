import React, { Suspense } from 'react';
import { render, waitFor } from '@testing-library/react';
import { DatasetSearchPageLazy } from '../lazy/DatasetSearchPageLazy';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const renderWithProviders = (node: React.ReactElement) => {
  (globalThis as any).__COSTSCOPE_API__ = {};
  (globalThis as any).ResizeObserver = class { observe() {}; unobserve() {}; disconnect() {} } as any;
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}><Suspense fallback={null}>{node}</Suspense></QueryClientProvider>);
};

describe('DatasetSearchPageLazy smoke', () => {
  it('renders lazy component without act() warning', async () => {
    // Ensure the lazy module is preloaded so Suspense resolves deterministically in tests
    await import('../components/pages/DatasetSearchPage');
    const { container } = renderWithProviders(<DatasetSearchPageLazy /> as any);
    // Wait for React.lazy to resolve and render something
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });
  });
});
