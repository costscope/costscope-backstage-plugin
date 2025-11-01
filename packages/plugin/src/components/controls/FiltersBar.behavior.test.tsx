import React from 'react';
import { fireEvent } from '@testing-library/react';
import { FiltersBar } from './FiltersBar';
import { renderWithProviders } from 'src/testing/utils/renderWithProviders';

// Mock analytics so we can assert captureEvent calls
jest.mock('@backstage/core-plugin-api', () => {
  const actual = jest.requireActual('@backstage/core-plugin-api');
  const analytics = { captureEvent: jest.fn() };
  return {
    ...actual,
    useApi: (ref: any) => {
      if (ref?.id === 'core.analytics') return analytics;
      return {} as any; // other refs are not used in this test
    },
  };
});

describe('FiltersBar behavior', () => {
  it('clicking period triggers onChange and analytics', () => {
    const onChangePeriod = jest.fn();
    const onChangeGroup = jest.fn();

    const { getByText } = renderWithProviders(
      <FiltersBar
        period="P30D"
        group="ServiceCategory"
        onChangePeriod={onChangePeriod}
        onChangeGroup={onChangeGroup}
      />,
    );

    fireEvent.click(getByText('7D'));

    expect(onChangePeriod).toHaveBeenCalledWith('P7D');
    // Analytics mocked above should record an event
    const { useApi } = jest.requireMock('@backstage/core-plugin-api');
    const analytics: any = (useApi as any)({ id: 'core.analytics' });
    expect(analytics.captureEvent).toHaveBeenCalledTimes(1);
    expect(analytics.captureEvent.mock.calls[0][0]).toMatchObject({
      context: 'costscope',
      action: 'costscope.period.change',
      subject: 'P7D',
    });
  });
});
