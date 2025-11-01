// Simple time-series downsampling using Largest-Triangle-One-Bucket (LTOB)
// Reference: Sveinn Steinarsson (2013) "Downsampling Time Series for Visual Representation"
// If points <= maxPoints (default 180) returns original array (no copy) for zero overhead.
// Always includes first & last points. Designed for line chart performance.
export interface PointLike { date: string; cost: number; [k: string]: any }

// Compute an adaptive target point count based on container width.
// Heuristic: ~ pxPerPoint pixels per rendered point (default 2px) with min/max guards.
// Falls back to fallbackPoints (default 180) if width is undefined / 0.
export function computeAdaptiveMaxPoints(
  width: number | undefined | null,
  {
    pxPerPoint = 2,
    minPoints = 60,
    maxPoints = 800,
    fallbackPoints = 180,
  }: { pxPerPoint?: number; minPoints?: number; maxPoints?: number; fallbackPoints?: number } = {},
): number {
  if (!width || width <= 0) return fallbackPoints;
  const est = Math.floor(width / pxPerPoint);
  return Math.min(maxPoints, Math.max(minPoints, est));
}

// Adaptive wrapper: chooses maxPoints based on width & calls LTOB.
export function downsampleAdaptive<T extends PointLike>(
  data: T[] | undefined | null,
  width: number | undefined | null,
  opts?: { pxPerPoint?: number; minPoints?: number; maxPoints?: number; fallbackPoints?: number },
): T[] {
  const target = computeAdaptiveMaxPoints(width, opts);
  return downsampleLTOB(data as any, target) as T[];
}

export function downsampleLTOB<T extends PointLike>(data: T[] | undefined | null, maxPoints = 180): T[] {
  if (!data || data.length === 0) return [];
  if (data.length <= maxPoints) return data; // keep original reference
  const buckets = maxPoints - 2; // interior points
  const bucketSize = (data.length - 2) / buckets;
  const out: T[] = [];
  let a = 0; // last chosen index
  out.push(data[a]);
  for (let i = 0; i < buckets; i++) {
    const rangeStart = Math.floor(1 + i * bucketSize);
    const rangeEnd = Math.floor(1 + (i + 1) * bucketSize);
    const rangeEndClamped = Math.min(rangeEnd, data.length - 1);
    // Average over next bucket for triangle area base
    let avgStart = Math.floor(1 + (i + 1) * bucketSize);
    let avgEnd = Math.floor(1 + (i + 2) * bucketSize);
    avgStart = Math.min(avgStart, data.length - 1);
    avgEnd = Math.min(avgEnd, data.length - 1);
    let avgX = 0, avgY = 0, cnt = 0;
    for (let j = avgStart; j < avgEnd; j++) {
      avgX += j;
      avgY += data[j].cost;
      cnt++;
    }
    if (cnt) { avgX /= cnt; avgY /= cnt; } else { avgX = rangeStart; avgY = data[rangeStart]?.cost ?? 0; }
    let maxArea = -1; let sel = rangeStart;
    for (let j = rangeStart; j < rangeEndClamped; j++) {
      const p = data[j];
      // Use indices as x-values to avoid date parsing cost; relative geometry preserved.
      const area = Math.abs((a - avgX) * (p.cost - data[a].cost) - (a - j) * (avgY - data[a].cost));
      if (area > maxArea) { maxArea = area; sel = j; }
    }
    a = sel;
    out.push(data[a]);
  }
  out.push(data[data.length - 1]);
  return out;
}
