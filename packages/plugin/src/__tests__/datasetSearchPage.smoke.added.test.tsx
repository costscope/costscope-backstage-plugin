import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DatasetSearchPage, { DatasetSearchPage as NamedDataset } from '../components/pages/DatasetSearchPage';

const withQ = (node: React.ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>);

test('DatasetSearchPage renders and form can submit/reset', () => {
  withQ(<NamedDataset /> as any);
  // ensure title present
  expect(screen.getByRole('region')).toBeTruthy();
  // find and click apply/reset buttons (by role or text)
  const apply = screen.getByRole('button', { name: /apply/i }) || screen.getByText(/apply/i);
  fireEvent.click(apply);
  const reset = screen.getByRole('button', { name: /reset/i }) || screen.getByText(/reset/i);
  fireEvent.click(reset);
});
