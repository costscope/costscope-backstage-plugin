import React from 'react';
import { render } from '@testing-library/react';
import { FormattingProvider, useFormatting } from './formatting';

const Probe = ({ value }: { value: number }) => {
  const { formatCurrency, formatPercent, currency } = useFormatting();
  return (
    <div>
      <span data-testid="c">{formatCurrency(value)}</span>
      <span data-testid="p">{formatPercent(0.1234, { fractionDigits: 2 })}</span>
      <span data-testid="cur">{currency}</span>
    </div>
  );
};

describe('FormattingProvider', () => {
  it('formats currency and percent', () => {
    const { getByTestId } = render(
      <FormattingProvider currency="USD">
        <Probe value={12.34} />
      </FormattingProvider>,
    );
    expect(getByTestId('c').textContent).toMatch(/12/); // locale dependent
    expect(getByTestId('p').textContent).toBe('12.34%');
  });

  it('reformats when app-config currency changes (USD -> EUR)', () => {
    const makeConfig = (currency: string) => ({
      getOptionalString: (path: string) => (path === 'costscope.currency' ? currency : undefined),
    });

    const renderWithConfig = (currency: string) => (
      <FormattingProvider configApi={makeConfig(currency)}>
        <Probe value={12.34} />
      </FormattingProvider>
    );

    const { getByTestId, rerender } = render(renderWithConfig('USD'));
    const usdValue = getByTestId('c').textContent;
    expect(getByTestId('cur').textContent).toBe('USD');

    rerender(renderWithConfig('EUR'));
    const eurValue = getByTestId('c').textContent;
    expect(getByTestId('cur').textContent).toBe('EUR');
    expect(eurValue).not.toBe(usdValue);
  });
});
