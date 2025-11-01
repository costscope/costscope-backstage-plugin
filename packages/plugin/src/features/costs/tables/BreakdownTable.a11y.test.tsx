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

// Simplified Table so axe can scan semantic structure; Backstage Table uses material-table which is heavy to render in tests
jest.mock('@backstage/core-components', () => {
  const { mockCoreComponents } = jest.requireActual('../../../testing/simpleBackstageMocks');
  return mockCoreComponents();
});

/// <reference path="../../../types/jest-axe.d.ts" />
import React from 'react';
// Using require to avoid needing full TypeScript typings for jest-axe
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { axe } = require('jest-axe');
import { renderWithProviders } from '../../../testing/utils/renderWithProviders';
import { BreakdownTable } from './BreakdownTable';

describe('BreakdownTable accessibility', () => {
  it('no violations with data (v1)', async () => {
    const { container } = renderWithProviders(
      <BreakdownTable group="ServiceCategory" period="P7D" />,
      {
        mockApi: {
          getBreakdown: async () => [
            { dim: 'Compute', cost: 100, deltaPct: 0.1 },
            { dim: 'Storage', cost: 50, deltaPct: -0.05 },
          ],
        },
      },
    );
  // Let React Query flush state updates; wrap in act to avoid warnings
  await new Promise(r => setTimeout(r, 0));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('wires heading -> region and caption -> table ARIA attributes', async () => {
    const { findByText, getByRole } = renderWithProviders(
      <BreakdownTable group="ServiceCategory" period="P7D" />,
      {
        mockApi: {
          getBreakdown: async () => [
            { dim: 'Compute', cost: 100, deltaPct: 0.1 },
          ],
        },
      },
    );
    // Wait for heading text to ensure data state rendered (not skeleton)
    await findByText(/ServiceCategory Breakdown/);
    const region = getByRole('region');
    expect(region).toBeTruthy();
    const labelledBy = region.getAttribute('aria-labelledby');
    expect(labelledBy).toMatch(/costscope-servicecategory-breakdown-heading/);
    const headingEl = document.getElementById(labelledBy!);
    expect(headingEl).not.toBeNull();
    const table = getByRole('table');
    expect(table.getAttribute('aria-label')).toBe('ServiceCategory cost breakdown table');
    const describedBy = table.getAttribute('aria-describedby');
    expect(describedBy).toBe(`${labelledBy}-caption`);
    const caption = document.getElementById(describedBy!);
    expect(caption).not.toBeNull();
    expect(caption?.textContent).toMatch(/Table listing ServiceCategory cost/);
  });

  it('no violations in skeleton state', async () => {
    // Force loading: supply getBreakdown promise that never resolves (simulate loading) then run axe immediately
    const never = new Promise<unknown>(() => {});
    const { container, getByTestId } = renderWithProviders(
      <BreakdownTable group="ServiceCategory" period="P7D" />, {
        mockApi: { getBreakdown: async () => (await never) as any },
      },
    );
    // Skeleton rendered instantly
    expect(getByTestId('breakdown-table-skeleton')).toBeTruthy();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('no violations in error state', async () => {
    const { container, findByText } = renderWithProviders(
      <BreakdownTable group="ServiceCategory" period="P7D" />, {
        mockApi: { getBreakdown: async () => { throw Object.assign(new Error('FailX'), { correlationId: 'cid123' }); } },
      },
    );
    await findByText('Failed to load data. Please retry.');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('no violations when empty', async () => {
    const { container, findByText } = renderWithProviders(<BreakdownTable group="ServiceCategory" period="P7D" />, {
      mockApi: { getBreakdown: async () => [] },
    });
    await findByText('No data');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('no violations with v2 flag (extra column)', async () => {
    const { container } = renderWithProviders(
      <BreakdownTable group="ServiceCategory" period="P7D" />, {
        mockApi: {
          getBreakdown: async () => [
            { dim: 'Compute', cost: 120, deltaPct: 0.2, effectiveCost: 130 },
          ],
        },
        featureFlags: { 'costscope.breakdown.v2': true },
      },
    );
    await new Promise(r => setTimeout(r, 0));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
