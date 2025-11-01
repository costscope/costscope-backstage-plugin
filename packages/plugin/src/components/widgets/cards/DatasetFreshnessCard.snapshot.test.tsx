import React from 'react';
import { DatasetFreshnessCard } from './DatasetFreshnessCard';
// Reuse mock pattern (see ProvidersPanel tests)
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

describe('<DatasetFreshnessCard />', () => {
  it('renders list', async () => {
    const mockApi: any = { getDatasets: async () => [{ id: 'd1', provider: 'aws', periodStart: '2025-07-01', periodEnd: '2025-07-31', status: 'ready', records: 1000 }] };
    const { findByText } = renderWithProviders(<DatasetFreshnessCard limit={5} />, { mockApi });
    const el = await findByText('d1');
    expect(el).toBeTruthy();
  });
  it('renders empty state', async () => {
    const mockApi: any = { getDatasets: async () => [] };
    const { findByText } = renderWithProviders(<DatasetFreshnessCard />, { mockApi });
    const emptyEl = await findByText('No datasets'); // will add i18n key in messages
    expect(emptyEl).toBeTruthy();
  });
});
