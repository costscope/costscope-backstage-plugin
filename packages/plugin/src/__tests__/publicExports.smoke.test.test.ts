// Updated smoke test: verify page component still exported and legacy stub gone.
import { CostscopePage, costscope } from '..';

describe('public exports (post-stub removal)', () => {
  it('exports CostscopePage component', () => {
    expect(CostscopePage).toBeDefined();
  });
  it('no CostscopePageExtension export anymore', async () => {
    const root = await import('..');
    expect('CostscopePageExtension' in root).toBe(false);
  });
  it('plugin has empty extensions array', () => {
    expect(costscope.extensions).toEqual([]);
  });
});
