import { computeBreakdownTableData } from './BreakdownTable';

describe('computeBreakdownTableData', () => {
  it('passes through data when v2 disabled', () => {
    const rows: any[] = [{ dim: 'A', cost: 100, deltaPct: 0.1 }];
    expect(computeBreakdownTableData(rows as any, false)).toBe(rows);
  });
  it('derives effectiveCost and recomputed delta', () => {
    const rows: any[] = [
      { dim: 'X', cost: 500, deltaPct: 0 },
      { dim: 'Y', cost: 200, deltaPct: 0.2, effectiveCost: 150 },
    ];
    const out = computeBreakdownTableData(rows as any, true)!;
    const x = out[0];
    expect(x.effectiveCost).toBe(500); // deltaPct 0 -> fallback cost * (1 - 0)
    expect(x.deltaPct).toBeCloseTo(0, 5);
    const y = out[1];
    expect(y.effectiveCost).toBe(150);
    expect(y.deltaPct).toBeCloseTo((150 - 200) / 200, 5);
  });
});
