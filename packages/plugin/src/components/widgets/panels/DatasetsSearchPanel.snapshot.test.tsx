import React from 'react';
import { DatasetsSearchPanel } from './DatasetsSearchPanel';
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

describe('<DatasetsSearchPanel />', () => {
  it('renders rows', async () => {
    const mockApi: any = { searchDatasets: async () => [{ id: 'd1', provider: 'aws', periodStart: '2025-07-01', periodEnd: '2025-07-31', records: 100, status: 'ready' }] };
    const { findByText } = renderWithProviders(<DatasetsSearchPanel limit={10} />, { mockApi });
  const el = await findByText('d1');
  expect(el).toBeTruthy();
  });
  it('renders empty', async () => {
    const mockApi: any = { searchDatasets: async () => [] };
    const { findByText } = renderWithProviders(<DatasetsSearchPanel />, { mockApi });
  const emptyEl = await findByText('No datasets matched filters');
  expect(emptyEl).toBeTruthy();
  });
});
