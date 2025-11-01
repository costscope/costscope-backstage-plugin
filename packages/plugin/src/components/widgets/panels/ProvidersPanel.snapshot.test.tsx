import React from 'react';
import { ProvidersPanel } from './ProvidersPanel';
// Mirror existing snapshot test pattern (see ActionItemsPanel.snapshot.test.tsx)
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
import { screen, waitFor } from '@testing-library/react';

describe('<ProvidersPanel />', () => {
  it('renders list', async () => {
    const mockApi: any = { getProviders: async () => [{ id: 'aws', name: 'AWS', status: 'ok' }] };
    renderWithProviders(<ProvidersPanel />, { mockApi });
    // Wait for skeleton to disappear to avoid false negatives on slower CI
    await waitFor(() => expect(screen.queryByTestId('providers-skeleton')).toBeNull());
    const el = await screen.findByText('AWS');
    expect(el).toBeTruthy();
  });
  it('renders empty state', async () => {
    const mockApi: any = { getProviders: async () => [] };
    renderWithProviders(<ProvidersPanel />, { mockApi });
    await waitFor(() => expect(screen.queryByTestId('providers-skeleton')).toBeNull());
    const emptyEl = await screen.findByText('No providers returned');
    expect(emptyEl).toBeTruthy();
  });
});
