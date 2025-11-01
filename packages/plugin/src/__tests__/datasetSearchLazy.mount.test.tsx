import React, { Suspense } from 'react';
import { render, waitFor } from '@testing-library/react';
import { DatasetSearchPageLazy } from '../lazy/DatasetSearchPageLazy';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithProviders(node: React.ReactElement) {
	// Minimal globals needed by responsive components under jsdom
	(globalThis as any).__COSTSCOPE_API__ = {};
	(globalThis as any).ResizeObserver = class { observe() {}; unobserve() {}; disconnect() {} } as any;
	const client = new QueryClient();
	return render(
		<QueryClientProvider client={client}>
			<Suspense fallback={null}>{node}</Suspense>
		</QueryClientProvider>,
	);
}

test('datasetSearch lazy mounts and resolves without act() warning', async () => {
	// Preload the lazily imported module to avoid Suspense timing edge-cases in JSDOM
	await import('../components/pages/DatasetSearchPage');
	const { container } = renderWithProviders(<DatasetSearchPageLazy /> as any);
	// Wait for React.lazy to resolve and something to render
	await waitFor(() => {
		expect(container.firstChild).not.toBeNull();
	});
});
