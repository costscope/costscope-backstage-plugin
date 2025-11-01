import { createFormatters } from './formatting';

describe('formatCurrencyCompact fallback', () => {
  const realNumberFormat = Intl.NumberFormat;
  beforeAll(() => {
    // Override global NumberFormat to throw when compact notation requested
    Intl.NumberFormat = function (locale: string | string[], opts?: Intl.NumberFormatOptions) {
      if (opts && (opts as any).notation === 'compact') {
        throw new Error('compact not supported');
      }
      return new realNumberFormat(locale as any, opts);
    } as any;
  });
  afterAll(() => {
    Intl.NumberFormat = realNumberFormat;
  });

  it('produces manual compact representation with suffixes', () => {
    const { formatCurrencyCompact } = createFormatters('en-US', 'USD');
    const k = formatCurrencyCompact(1234);
    expect(k).toMatch(/\$1(\.2\d?)?K|1(\.2\d?)?K\s?\$/); // allow minor rounding differences & suffix placement
    const m = formatCurrencyCompact(1_234_567);
    expect(m).toMatch(/M/);
  });

  it('handles negative values and trimming zeros', () => {
    const { formatCurrencyCompact } = createFormatters('en-US', 'USD');
    const v = formatCurrencyCompact(-2500000, { maximumFractionDigits: 3 });
    expect(v).toMatch(/-.*2\.5M/);
  });
});
