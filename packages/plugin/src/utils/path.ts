/**
 * Build a REST path with query parameters, omitting undefined / empty values.
 * Parameters are sorted by key for deterministic ordering (important for cache keys and tests).
 * @public
 */
export function buildPath(endpoint: string, params: Record<string, string | undefined>): string {
  const keys = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== '');
  if (keys.length === 0) return endpoint;
  keys.sort();
  const qp = new URLSearchParams();
  for (const k of keys) {
    qp.set(k, params[k]!);
  }
  return `${endpoint}?${qp.toString()}`;
}
