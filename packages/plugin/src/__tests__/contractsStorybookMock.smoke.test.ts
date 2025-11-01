import React from 'react';
import { render } from '@testing-library/react';

test('contractsStorybookMock placeholder', () => {
  const { container } = render(React.createElement('div'));
  expect(container).toBeDefined();
});
