import React from 'react';
import { FiltersBar } from './FiltersBar';
import { renderWithProviders } from 'src/testing/utils/renderWithProviders';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { axe } = require('jest-axe');

describe('FiltersBar a11y', () => {
  it('has no axe violations and exposes labels', async () => {
    const { container, getByRole, getByLabelText } = renderWithProviders(
      <FiltersBar
        period="P30D"
        group="ServiceCategory"
        onChangePeriod={() => {}}
        onChangeGroup={() => {}}
      />,
    );

    // Landmark/labels
    expect(getByRole('group', { name: /select period/i })).toBeTruthy();
    expect(getByLabelText(/group by/i)).toBeTruthy();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
