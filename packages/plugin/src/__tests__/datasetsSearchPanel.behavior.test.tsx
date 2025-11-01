import React from 'react';
import { render } from '@testing-library/react';

test('datasetsSearchPanel behavior placeholder', () => {
	const { container } = render(<div />);
	expect(container).toBeDefined();
});
