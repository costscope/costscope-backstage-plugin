// Updated test: legacy extension stubs removed. Ensure they are absent and plugin.extensions empty.
import { costscope } from './plugin';

describe('Costscope plugin extension stubs removal', () => {
  it('does not export legacy stubs anymore', async () => {
    // Dynamic import root to inspect exports
    const root = await import('..');
    expect('CostscopePageExtension' in root).toBe(false);
    expect('EntityCostscopeContentExtension' in root).toBe(false);
  });
  it('plugin.extensions is an empty array', () => {
    expect(costscope.extensions).toEqual([]);
  });
});
