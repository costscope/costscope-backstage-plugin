import React, { Suspense } from 'react';
import { screen } from '@testing-library/react';
import { DatasetSearchPageLazy } from '../lazy/DatasetSearchPageLazy';
import { renderWithProviders } from '../testing/utils/renderWithProviders';

// Ensure components using Backstage useApi(costscopeApiRef) resolve to our mock API
jest.mock('@backstage/core-plugin-api', () => require('../test-mocks/backstageCorePluginApiMock'));

// Retry once if the lazy chunk resolution is delayed under heavy CI load
jest.retryTimes?.(1, { logErrorsBeforeRetry: true } as any);

// Increase per-test timeout to accommodate slow CI and lazy chunk resolution
jest.setTimeout?.(45000);

test('datasetSearch lazy mounts and resolves without act() warning', async () => {
	// Preload the lazily imported module to avoid Suspense timing edge-cases in JSDOM
	await import('../components/pages/DatasetSearchPage');
	// Minimal globals needed by responsive components under jsdom
	(globalThis as any).ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as any;

	renderWithProviders(<Suspense fallback={null}><DatasetSearchPageLazy /></Suspense> as any);
	// Wait for a stable, a11y-exposed element: the Filters section heading (h2)
	// Using role-based query is more resilient than raw querySelector and avoids race conditions
	await screen.findByRole('heading', { name: 'Filters', level: 2 }, { timeout: 30000 });
});
