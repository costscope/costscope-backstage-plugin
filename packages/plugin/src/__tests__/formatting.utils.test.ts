import { createFormatters } from '../formatting';
import { formatDateShortLabel } from '../formatting/date';

describe('formatting helpers', () => {
  it('formats currency and percent and compact suffixed values', () => {
    const { formatCurrency, formatCurrencyCompact, formatPercent } = createFormatters('en-US', 'USD');
    expect(formatCurrency(null)).toBe('–');
    expect(formatPercent(0.123, { fractionDigits: 1 })).toBe('12.3%');

    const large = formatCurrencyCompact(1_234_567);
    // Accept either compact symbol from Intl or our fallback suffix (M/B/K/T)
    expect(/M|B|K|T/.test(large)).toBe(true);
  });

  it('formatDateShortLabel returns input string on invalid date', () => {
    const res = formatDateShortLabel('not-a-date', 'en-US');
    expect(typeof res).toBe('string');
    expect(res).toBe('not-a-date');
  });
});
