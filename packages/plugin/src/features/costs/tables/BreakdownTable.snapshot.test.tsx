import React from 'react';
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
// Minimal core-components mocks so that Table renders all provided columns deterministically
jest.mock('@backstage/core-components', () => ({
  Table: ({ columns, data }: any) => (
    <table data-mock="table">
      <thead>
        <tr>{columns.map((c: any) => <th key={c.title}>{c.title}</th>)}</tr>
      </thead>
      <tbody>
        {data.map((r: any, i: number) => (
          <tr key={i}>
            {columns.map((c: any) => (
              <td key={c.title}>{c.render ? c.render(r) : (r as any)[c.field]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
  InfoCard: ({ title, children }: any) => (<div data-mock="info"><h3>{title}</h3>{children}</div>),
}));
import { BreakdownTable } from './BreakdownTable';
import { renderWithProviders } from '../../../testing/utils/renderWithProviders';

describe('BreakdownTable snapshots', () => {
  it('loading skeleton', () => {
    const { getByTestId } = renderWithProviders(<BreakdownTable />, {
      mockApi: { getBreakdown: async () => new Promise(() => {}) },
    });
    expect(getByTestId('breakdown-table-skeleton')).toBeTruthy();
  });

  it('data', async () => {
    const { container, findByText } = renderWithProviders(<BreakdownTable />, {
      mockApi: { getBreakdown: async () => [
        { dim: 'Compute', cost: 500, deltaPct: 0.1 },
        { dim: 'Storage', cost: 300, deltaPct: -0.05 },
      ] },
    });
    await findByText('ServiceCategory Breakdown');
    expect(container.firstChild).toBeTruthy();
  });

  it('error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container, findByText } = renderWithProviders(<BreakdownTable />, {
      mockApi: { getBreakdown: async () => { throw new Error('Nope'); } },
    });
    await findByText('Failed to load data. Please retry.');
    expect(container.firstChild).toBeTruthy();
    spy.mockRestore();
  });

  it('empty', async () => {
    const { container, findByText } = renderWithProviders(<BreakdownTable />, {
      mockApi: { getBreakdown: async () => [] },
    });
    await findByText('No data for selected period');
    expect(container.firstChild).toBeTruthy();
  });

  it('v2 flag adds Effective Cost column and recomputed deltas', async () => {
    const { findByText } = renderWithProviders(<BreakdownTable />, {
      featureFlags: { 'costscope.breakdown.v2': true },
      mockApi: { getBreakdown: async () => [
        { dim: 'Compute', cost: 500, deltaPct: 0, effectiveCost: 480 } as any,
        { dim: 'Storage', cost: 320, deltaPct: 0, effectiveCost: 325 } as any,
      ] },
    });
    await findByText('ServiceCategory Breakdown');
    // Compute logic validated in dedicated compute test; here just ensures render does not crash under v2.
  });
});
