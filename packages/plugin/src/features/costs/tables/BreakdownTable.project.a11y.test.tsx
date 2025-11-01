jest.mock('@backstage/core-plugin-api', () => {
  const actual = jest.requireActual('@backstage/core-plugin-api');
  return {
    ...actual,
    useApi: (ref: any) => {
      if (ref?.id === 'plugin.costscope.service') return (globalThis as any).__COSTSCOPE_MOCK_API__;
      if (ref?.id === 'core.featureFlags') return { isActive: () => false };
      return {} as any;
    },
  };
});

// Mock core components thinly to keep semantic HTML
jest.mock('@backstage/core-components', () => {
  const { mockCoreComponents } = jest.requireActual('../../../testing/simpleBackstageMocks');
  return mockCoreComponents();
});

/// <reference path="../../../types/jest-axe.d.ts" />
import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { axe } = require('jest-axe');
import { renderWithProviders } from '../../../testing/utils/renderWithProviders';
import { BreakdownTable } from './BreakdownTable';

// Ensures the project suffix in heading doesn't break region/table wiring
// and overall DOM passes axe scan.
describe('BreakdownTable accessibility (project scoped)', () => {
  it('includes project in heading and remains a11y clean', async () => {
    const { container, findByText, getByRole } = renderWithProviders(
      <BreakdownTable group="ServiceCategory" period="P30D" project="finops-project-payments" />, {
        mockApi: {
          getBreakdown: async () => [
            { dim: 'Compute', cost: 100, deltaPct: 0.1 },
            { dim: 'Storage', cost: 50, deltaPct: -0.05 },
          ],
        },
      }
    );
    await findByText('ServiceCategory Breakdown (finops-project-payments)');
    const region = getByRole('region');
    const labelledBy = region.getAttribute('aria-labelledby');
    expect(document.getElementById(labelledBy!)).not.toBeNull();
    const table = getByRole('table');
    expect(table).toBeTruthy();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
