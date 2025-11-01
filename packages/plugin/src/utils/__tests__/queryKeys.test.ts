import { qk } from 'src/utils/queryKeys';

describe('queryKeys with project scoping', () => {
  it('overview without project uses empty sentinel', () => {
    expect(qk.overview('P30D')).toEqual(['costscope', 'overview', 'P30D', '']);
  });
  it('overview with project includes project', () => {
    expect(qk.overview('P30D', 'proj1')).toEqual(['costscope', 'overview', 'P30D', 'proj1']);
  });
  it('breakdown with project', () => {
    expect(qk.breakdown('ServiceCategory', 'P7D', 'abc')).toEqual([
      'costscope',
      'breakdown',
      'ServiceCategory',
      'P7D',
      'abc',
    ]);
  });
  it('actionItems with project', () => {
    expect(qk.actionItems('xyz')).toEqual(['costscope', 'actionItems', 'xyz']);
  });
});
