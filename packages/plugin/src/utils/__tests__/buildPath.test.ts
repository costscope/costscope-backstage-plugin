import { buildPath } from 'src/utils/buildPath';

describe('buildPath', () => {
  it('returns endpoint when no params', () => {
    expect(buildPath('/alerts', {})).toBe('/alerts');
  });

  it('omits undefined and empty params', () => {
    expect(buildPath('/costs/daily', { period: 'P30D', project: undefined, foo: '' })).toBe(
      '/costs/daily?period=P30D',
    );
  });

  it('sorts keys for stable ordering', () => {
    const path = buildPath('/breakdown', {
      project: 'foo',
      period: 'P7D',
      by: 'ServiceCategory',
    });
    expect(path).toBe('/breakdown?by=ServiceCategory&period=P7D&project=foo');
  });
});
