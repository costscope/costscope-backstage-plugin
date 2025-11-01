import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CacheEventsPanel } from '../components/dev/CacheEventsPanel';

const withQ = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

test('CacheEventsPanel renders minimal region', () => {
  withQ(<CacheEventsPanel /> as any);
  // panel has test id
  expect(screen.getByTestId('cache-events-panel')).toBeTruthy();
});
