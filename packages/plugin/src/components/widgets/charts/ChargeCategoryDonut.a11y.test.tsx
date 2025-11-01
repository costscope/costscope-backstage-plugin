/// <reference path="../../../types/jest-axe.d.ts" />
import React from 'react';
import { renderWithProviders } from '../../../testing/utils/renderWithProviders';
import { ChargeCategoryDonut } from './ChargeCategoryDonut';
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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { axe } = require('jest-axe');

// Note: Recharts may require ResizeObserver; the component guards for jsdom
describe('a11y: ChargeCategoryDonut', () => {
  const originalResizeObserver = (globalThis as any).ResizeObserver;
  // Provide a minimal ResizeObserver polyfill for jsdom environment
  beforeAll(() => {
    if (typeof (globalThis as any).ResizeObserver === 'undefined') {
      (globalThis as any).ResizeObserver = class {
        observe() {/* noop */}
        unobserve() {/* noop */}
        disconnect() {/* noop */}
      };
    }
  });
  afterAll(() => {
    (globalThis as any).ResizeObserver = originalResizeObserver;
  });
  it('has no violations (data)', async () => {
    const { container, findByRole } = renderWithProviders(<ChargeCategoryDonut period="P30D" />, {
      mockApi: {
        getBreakdown: async () => [
          { dim: 'Compute', cost: 120, deltaPct: 0.12 },
          { dim: 'Storage', cost: 60, deltaPct: -0.04 },
          { dim: 'Network', cost: 30, deltaPct: 0.01 },
        ],
      },
    });
    await findByRole('heading', { name: /Charge Categories/i });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations (empty)', async () => {
    const { container, findByText } = renderWithProviders(<ChargeCategoryDonut period="P30D" />, {
      mockApi: { getBreakdown: async () => [] },
    });
    await findByText(/no data/i);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
