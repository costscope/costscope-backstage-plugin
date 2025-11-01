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
import { ProvidersPanel } from './ProvidersPanel';

describe('<ProvidersPanel /> accessibility', () => {
  // Use global timeout
  jest.setTimeout(120000);
  it('has no detectable a11y violations (default state)', async () => {
    const mockApi: any = {
      getProviders: async () => [
        { id: 'aws', name: 'Amazon Web Services', displayName: 'Amazon Web Services', status: 'ok' },
        { id: 'azure', name: 'Microsoft Azure', displayName: 'Microsoft Azure', status: 'degraded' },
      ],
    };
    const { container, findByText } = renderWithProviders(<ProvidersPanel />, { mockApi: mockApi });
    await findByText('Amazon Web Services');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
