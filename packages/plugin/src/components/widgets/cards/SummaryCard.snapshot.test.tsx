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
import { renderWithProviders } from '../../../testing/utils/renderWithProviders';
import { SummaryCard } from './SummaryCard';

describe('SummaryCard', () => {
  it('renders loading skeleton', () => {
    const { getByTestId } = renderWithProviders(<SummaryCard period="P7D" />, {
      mockApi: { getSummary: async () => new Promise(() => {}) },
    });
    expect(getByTestId('summary-skeleton')).toBeTruthy();
  });

  it('renders data', async () => {
    const { container, findByText } = renderWithProviders(<SummaryCard period="P7D" />, {
  mockApi: { getSummary: async () => ({ period: 'P7D', totalCost: 123.45, prevPeriodCost: 100, deltaPct: 0.234, currency: 'USD' }) as any },
    });
    await findByText('Summary');
  // Remove transient MUI ripple nodes that can differ across envs before snapshot
  const root = container.firstChild as HTMLElement;
  root.querySelectorAll('.MuiTouchRipple-root').forEach(n => n.remove());
  expect(root).toMatchSnapshot();
  });

  it('renders error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container, findByText } = renderWithProviders(<SummaryCard period="P7D" />, {
      mockApi: { getSummary: async () => { throw new Error('boom'); } },
    });
  await findByText('Failed to load data. Please retry.');
  const rootErr = container.firstChild as HTMLElement;
  rootErr.querySelectorAll('.MuiTouchRipple-root').forEach(n => n.remove());
  expect(rootErr).toMatchSnapshot();
    spy.mockRestore();
  });

  it('renders empty', async () => {
    const { container, findByText } = renderWithProviders(<SummaryCard period="P7D" />, {
      mockApi: { getSummary: async () => undefined as any },
    });
  await findByText('No data for selected period');
  const rootEmpty = container.firstChild as HTMLElement;
  rootEmpty.querySelectorAll('.MuiTouchRipple-root').forEach(n => n.remove());
  expect(rootEmpty).toMatchSnapshot();
  });
});
