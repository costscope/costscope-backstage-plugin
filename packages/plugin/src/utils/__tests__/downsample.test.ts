import { downsampleLTOB, computeAdaptiveMaxPoints, downsampleAdaptive } from 'src/utils/downsample';

describe('downsampleLTOB', () => {
  it('returns original when below threshold', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ date: `2025-01-${String(i+1).padStart(2,'0')}`, cost: i }));
    const out = downsampleLTOB(data, 180);
    expect(out).toBe(data); // same reference
  });
  it('downsamples when above threshold', () => {
    const data = Array.from({ length: 400 }, (_, i) => ({ date: `2025-01-${String((i%30)+1).padStart(2,'0')}`, cost: Math.sin(i/5) * 100 + i }));
    const out = downsampleLTOB(data, 180);
    expect(out.length).toBeLessThanOrEqual(180);
    expect(out[0]).toEqual(data[0]);
    expect(out[out.length - 1]).toEqual(data[data.length - 1]);
  });
  it('computes adaptive max points from width', () => {
    expect(computeAdaptiveMaxPoints(0)).toBe(180); // fallback
    expect(computeAdaptiveMaxPoints(100)).toBeGreaterThanOrEqual(60); // min guard
    expect(computeAdaptiveMaxPoints(400)).toBe(200); // 400 / 2px
    expect(computeAdaptiveMaxPoints(2000)).toBeLessThanOrEqual(800); // capped
  });
  it('applies adaptive downsampling to large series', () => {
    const data = Array.from({ length: 2000 }, (_, i) => ({ date: `2025-02-${String((i%28)+1).padStart(2,'0')}`, cost: i + Math.cos(i/7) }));
    const width = 600; // => 300 target points
    const out = downsampleAdaptive(data, width);
    expect(out.length).toBeLessThanOrEqual(computeAdaptiveMaxPoints(width));
    // Ensure we reduced from original length significantly
    expect(out.length).toBeLessThan(data.length);
    expect(out[0]).toEqual(data[0]);
    expect(out[out.length - 1]).toEqual(data[data.length - 1]);
  });
});
