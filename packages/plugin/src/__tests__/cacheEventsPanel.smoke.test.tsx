import React from 'react';
import { render } from '@testing-library/react';
import { CacheEventsPanel } from '../components/dev/CacheEventsPanel';

test('CacheEventsPanel minimal smoke', () => {
	const { container } = render(<CacheEventsPanel /> as any);
	expect(container).toBeDefined();
});
