import React from 'react';
import { ActionItemsPanel } from './ActionItemsPanel';
jest.mock('@backstage/core-plugin-api', () => {
  const actual = jest.requireActual('@backstage/core-plugin-api');
  return {
    ...actual,
    useApi: (ref: any) => {
      if (ref?.id === 'plugin.costscope.service') return (globalThis as any).__COSTSCOPE_MOCK_API__;
      if (ref?.id === 'core.featureFlags') return { isActive: (n: string) => !!(globalThis as any).__COSTSCOPE_FLAGS__?.[n] };
      return {} as any; // minimal stub for other APIs
    },
  };
});
import { renderWithProviders } from 'src/testing/utils/renderWithProviders';

describe('ActionItemsPanel snapshots', () => {
  it('loading skeleton', () => {
    const { getByTestId } = renderWithProviders(<ActionItemsPanel />, {
      mockApi: { getActionItems: async () => new Promise(() => {}) },
    });
    expect(getByTestId('action-items-skeleton')).toBeTruthy();
  });

  it('data', async () => {
    const { container, findByTestId, findByText, queryByTestId } = renderWithProviders(<ActionItemsPanel />, {
      mockApi: { getActionItems: async () => [
        { id: '1', severity: 'critical', message: 'Anomaly' },
        { id: '2', severity: 'warn', message: 'Idle resource' },
      ] },
    });
    // Wait for skeleton to appear and then disappear to avoid race conditions
    await findByTestId('action-items-skeleton');
    // Allow next tick for state to settle
    await new Promise(r => setTimeout(r, 0));
    expect(queryByTestId('action-items-skeleton')).toBeNull();
    // Remove unstable MUI TouchRipple nodes for deterministic snapshots
  container.querySelectorAll('.MuiTouchRipple-root').forEach((el: Element) => el.remove());
    expect(container.firstChild).toMatchSnapshot();
  });

  it('error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container, findByTestId, findByText } = renderWithProviders(<ActionItemsPanel />, {
      mockApi: { getActionItems: async () => { throw new Error('ErrState'); } },
    });
    await findByTestId('action-items-skeleton');
    await findByText(/failed to load/i);
    // Remove unstable MUI TouchRipple nodes for deterministic snapshots
  container.querySelectorAll('.MuiTouchRipple-root').forEach((el: Element) => el.remove());
    expect(container.firstChild).toMatchSnapshot();
    spy.mockRestore();
  });

  it('empty', async () => {
    const { container, findByTestId, findByText } = renderWithProviders(<ActionItemsPanel />, {
      mockApi: { getActionItems: async () => [] },
    });
    await findByTestId('action-items-skeleton');
    // The title "No data" is rendered as a span within CardHeader, not a heading; assert on card content text instead
    await findByText(/no data for selected period/i);
    // Remove unstable MUI TouchRipple nodes for deterministic snapshots
  container.querySelectorAll('.MuiTouchRipple-root').forEach((el: Element) => el.remove());
    expect(container.firstChild).toMatchSnapshot();
  });
});
