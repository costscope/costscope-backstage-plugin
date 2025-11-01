import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DatasetsSearchPanel } from '../components/widgets/panels/DatasetsSearchPanel';

const withQ = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

test('DatasetsSearchPanel minimal smoke', () => {
	const { container } = withQ(<DatasetsSearchPanel /> as any);
	expect(container).toBeDefined();
});
