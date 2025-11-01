import React from 'react';
import { render } from '@testing-library/react';

test('testing helpers placeholder', () => {
	const { container } = render(<div />);
	expect(container).toBeDefined();
});
