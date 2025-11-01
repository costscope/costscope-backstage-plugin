import { computeBreakdownTableData } from './BreakdownTable';

// Additional variant test.
// downstream pipelines stop invoking this filename explicitly.
describe('BreakdownTable.v2 placeholder', () => {
  it('computes effective cost delta for a simple row', () => {
    const rows: any[] = [{ dim: 'R', cost: 100, deltaPct: 0, effectiveCost: 80 }];
    const out = computeBreakdownTableData(rows as any, true)!;
    expect(out[0].deltaPct).toBeCloseTo((80 - 100) / 100, 5);
  });
});
