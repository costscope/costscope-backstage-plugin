import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FiltersBar } from '../components/controls/FiltersBar';

const renderWithQ = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

test('FiltersBar renders and handles interactions', () => {
  renderWithQ(
    <FiltersBar period={'P30D'} group={'ServiceCategory'} onChangePeriod={() => {}} onChangeGroup={() => {}} /> as any,
  );

  // buttons for periods should exist (multiple) - click the first
  const btns = screen.getAllByRole('button', { name: /30D|7D|90D/i });
  expect(btns.length).toBeGreaterThan(0);
  fireEvent.click(btns[0]);

  // select should be present - use query to avoid throwing
  const select = screen.queryByLabelText(/groupby/i) || screen.getByRole('combobox');
  expect(select).toBeTruthy();
});
