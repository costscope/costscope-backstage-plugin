import { CostscopePage, costscope } from '..';

describe('public exports smoke', () => {
  it('exports CostscopePage', () => {
    expect(CostscopePage).toBeDefined();
  });
  it('plugin object exposes no legacy extensions', () => {
    expect(Array.isArray(costscope.extensions)).toBe(true);
    expect(costscope.extensions.length).toBe(0);
  });
});
