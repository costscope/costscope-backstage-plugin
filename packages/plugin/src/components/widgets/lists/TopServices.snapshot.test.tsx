import React from 'react';
import { TopServices } from './TopServices';
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
import { renderWithProviders } from 'src/testing/utils/renderWithProviders';

describe('TopServices snapshots', () => {
  it('loading skeleton', () => {
    const { getByTestId } = renderWithProviders(<TopServices />, {
      mockApi: { getBreakdown: async () => new Promise(() => {}) },
    });
    expect(getByTestId('top-services-skeleton')).toBeTruthy();
  });

  it('data', async () => {
    const { container, findByText } = renderWithProviders(<TopServices />, {
      mockApi: { getBreakdown: async () => [
        { dim: 'Compute', cost: 1000, deltaPct: 0.2 },
        { dim: 'DB', cost: 500, deltaPct: -0.1 },
      ] },
    });
    await findByText('Top Services');
    expect(container.firstChild).toMatchSnapshot();
  });

  it('error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container, findByText } = renderWithProviders(<TopServices />, {
      mockApi: { getBreakdown: async () => { throw new Error('Err'); } },
    });
    await findByText('Failed to load data. Please retry.');
    expect(container.firstChild).toMatchSnapshot();
    spy.mockRestore();
  });

  it('empty', async () => {
    const { container, findByText } = renderWithProviders(<TopServices />, {
      mockApi: { getBreakdown: async () => [] },
    });
    await findByText('No data for selected period');
    expect(container.firstChild).toMatchSnapshot();
  });
});
