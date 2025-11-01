/// <reference path="../../../types/jest-axe.d.ts" />
import React from 'react';
import { renderWithProviders } from '../../../testing/utils/renderWithProviders';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { CostDriversCard } from './CostDriversCard';
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
// Using require to avoid adding full TS types for jest-axe in build output
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { axe } = require('jest-axe');

describe('a11y: CostDriversCard', () => {
  it('has no detectable a11y violations (loaded state)', async () => {
    const { container, findByText } = renderWithProviders(<CostDriversCard period="P7D" limit={3} />, {
      mockApi: {
        getBreakdown: async () => [
          { dim: 'Compute', cost: 100, deltaPct: 0.1 },
          { dim: 'Storage', cost: 80, deltaPct: -0.05 },
          { dim: 'Network', cost: 40, deltaPct: 0 },
        ],
      },
    });
    await findByText('Compute');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations (empty state)', async () => {
    const { container, findByText } = renderWithProviders(<CostDriversCard period="P7D" />, {
      mockApi: { getBreakdown: async () => [] },
    });
    // ensure loading skeleton is gone before asserting content in Node 20
    await waitForElementToBeRemoved(() => screen.getByTestId('drivers-skeleton'));
    await findByText(/no data/i);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations (error state)', async () => {
    const { container, findByText } = renderWithProviders(<CostDriversCard period="P7D" />, {
      mockApi: { getBreakdown: async () => { throw new Error('boom'); } },
    });
    await waitForElementToBeRemoved(() => screen.getByTestId('drivers-skeleton'));
    await findByText(/error/i);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
