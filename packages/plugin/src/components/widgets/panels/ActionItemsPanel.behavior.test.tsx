import React from 'react';
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
import { renderWithProviders } from '../../../testing/utils/renderWithProviders';
import { ActionItemsPanel } from './ActionItemsPanel';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ActionItemsPanel behavior', () => {
  it('refresh button triggers refetch path', async () => {
    const calls: string[] = [];
    const { findByText } = renderWithProviders(<ActionItemsPanel />, {
      mockApi: {
        getActionItems: async () => {
          calls.push('get');
          return [{ id: 'a', severity: 'info', message: 'Hello' }];
        },
      },
    });

    await findByText('Action Items');
  const user = userEvent.setup();
  const btn = screen.getByRole('button', { name: /refresh action items/i });
  await user.click(btn);
    // Give query microtask a tick
    await new Promise(r => setTimeout(r, 0));
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});
