import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FiltersBar } from '../components/controls/FiltersBar';

const renderWithQ = (ui: React.ReactElement) =>
	render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

test('FiltersBar handles period and group changes', () => {
	const onChangePeriod = jest.fn();
	const onChangeGroup = jest.fn();

	renderWithQ(
		<FiltersBar
			period={'P30D'}
			group={'ServiceCategory'}
			onChangePeriod={onChangePeriod}
			onChangeGroup={onChangeGroup}
		/> as any,
	);

	// click a different period -> should call onChangePeriod
	const btn7 = screen.getByRole('button', { name: /7D/i });
	fireEvent.click(btn7);
	expect(onChangePeriod).toHaveBeenCalledWith('P7D');

	// clicking the current period should not call
	onChangePeriod.mockClear();
	const btn30 = screen.getByRole('button', { name: /30D/i });
	fireEvent.click(btn30);
	expect(onChangePeriod).not.toHaveBeenCalled();

		// change group via MUI Select: open menu then click option
		const select = screen.queryByLabelText(/group by/i) || screen.getByRole('combobox');
		expect(select).toBeTruthy();
		// MUI Select isn't a native select; open options and click the option
		fireEvent.mouseDown(select as Element);
		const option = screen.getByRole('option', { name: /Region/i }) || screen.getByText(/Region/i);
		fireEvent.click(option as Element);
		expect(onChangeGroup).toHaveBeenCalledWith('RegionId');
});
