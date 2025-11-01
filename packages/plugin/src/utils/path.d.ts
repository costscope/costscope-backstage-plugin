/**
 * Build a REST path with query parameters, omitting undefined / empty values.
 * Parameters are sorted by key for deterministic ordering (important for cache keys and tests).
 * @public
 */
export declare function buildPath(endpoint: string, params: Record<string, string | undefined>): string;
