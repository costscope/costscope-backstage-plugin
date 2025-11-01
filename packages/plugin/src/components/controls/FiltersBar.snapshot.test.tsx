import React from 'react';
import { FiltersBar } from './FiltersBar';
import { renderWithProviders } from 'src/testing/utils/renderWithProviders';

describe('FiltersBar snapshot', () => {
  it('renders default state (P30D, ServiceCategory)', () => {
    const { container, getByLabelText, getByRole } = renderWithProviders(
      <FiltersBar
        period="P30D"
        group="ServiceCategory"
        onChangePeriod={() => {}}
        onChangeGroup={() => {}}
      />,
    );

    // Basic smoke of aria wiring before snapshot
    expect(getByRole('group', { name: /select period/i })).toBeTruthy();
    expect(getByLabelText(/group by/i)).toBeTruthy();

    expect(container.firstChild).toMatchSnapshot();
  });
});
