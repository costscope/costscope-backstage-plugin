import { withProjectParam } from 'src/utils/projectParams';
import { PROJECT_QUERY_PARAM } from 'src/constants';

describe('withProjectParam', () => {
  it('returns original params when project is undefined', () => {
    const base = { period: 'P7D' } as const;
    const out = withProjectParam(base, undefined);
    expect(out).toEqual(base);
  });

  it('adds project param when provided', () => {
    const out = withProjectParam({ period: 'P7D' }, 'proj-x');
    expect(out).toEqual({ period: 'P7D', [PROJECT_QUERY_PARAM]: 'proj-x' });
  });

  it('does not mutate original object', () => {
    const base: any = { period: 'P30D' };
    const out = withProjectParam(base, 'foo');
    expect(base).toEqual({ period: 'P30D' });
    expect(out).toEqual({ period: 'P30D', [PROJECT_QUERY_PARAM]: 'foo' });
  });
});
