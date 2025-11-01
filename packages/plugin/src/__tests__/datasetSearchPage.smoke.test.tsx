import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DatasetSearchPage } from '../components/pages/DatasetSearchPage';

const withQ = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

test('DatasetSearchPage minimal smoke', () => {
	const { container } = withQ(<DatasetSearchPage /> as any);
	expect(container).toBeDefined();
});
