/// <reference path="../../../types/jest-axe.d.ts" />
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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { axe } = require('jest-axe');
import { renderWithProviders } from '../../../testing/utils/renderWithProviders';
import { DatasetsSearchPanel } from './DatasetsSearchPanel';

describe('<DatasetsSearchPanel /> accessibility', () => {
  // Use global timeout
  jest.setTimeout(120000);
  it('has no detectable a11y violations (default state)', async () => {
    const mockApi: any = {
      searchDatasets: async () => [
        { id: 'ds1', project: 'global', provider: 'aws', periodStart: '2025-07-01', periodEnd: '2025-07-31', records: 120000, status: 'ready' },
      ],
    };
    const { container, findByText } = renderWithProviders(<DatasetsSearchPanel limit={10} />, { mockApi: mockApi });
    await findByText('ds1');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
