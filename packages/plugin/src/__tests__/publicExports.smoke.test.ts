/**
 * Smoke test: ensure critical public exports exist so tree-shaking/regression
 * in build config doesn't silently drop them. Keeps bundle surface stable.
 */
import { CostscopePage, costscope } from '..';

describe('public exports smoke', () => {
  it('exports CostscopePage (component)', () => {
    expect(CostscopePage).toBeDefined();
  });

  it('plugin root has no legacy extension stubs', () => {
    expect(costscope.extensions).toEqual([]);
  });
});
