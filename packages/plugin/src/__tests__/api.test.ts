import { CostscopeClient } from './client';
import { DEFAULT_SERVICE_ID } from './constants';
import { clearCacheRecords, getCacheRecords, getRetryAttemptRecords, clearRetryAttemptRecords } from './retryTelemetry';

describe('CostscopeClient', () => {
  it('constructs', () => {
    const mock = {
      discoveryApi: { getBaseUrl: async (id: string) => `http://example/${id}` },
      fetchApi: { fetch: async () => ({ ok: true, json: async () => [] }) },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, serviceId: 'custom-service' });
    expect(client).toBeTruthy();
  });

  it('uses default serviceId when not provided', async () => {
    let requestedId: string | undefined;
    const mock = {
      discoveryApi: { getBaseUrl: async (id: string) => { requestedId = id; return 'http://example'; } },
      fetchApi: { fetch: async () => ({ ok: true, json: async () => [] }) },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient(mock);
    await client.getOverview('P1D');
  expect(requestedId).toBe(DEFAULT_SERVICE_ID);
  });

  it('retries on 503 then succeeds', async () => {
    const calls: number[] = [];
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async () => {
          calls.push(Date.now());
          if (calls.length < 2) {
            return { ok: false, status: 503 } as any;
          }
          return { ok: true, json: async () => [{ date: '2025-01-01', cost: 1 }] } as any;
        },
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, retry: { maxAttempts: 3, backoffBaseMs: 1 } });
    const data = await client.getOverview('P1D');
    expect(data).toHaveLength(1);
    expect(calls.length).toBe(2);
  });

  it('fails with HTTP_ERROR after retries exhausted', async () => {
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async () => ({ ok: false, status: 503 }),
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, retry: { maxAttempts: 2, backoffBaseMs: 1 } });
    await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: 'HTTP_ERROR', attempt: 2 });
  });

  it('timeouts via AbortController', async () => {
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async (_url: string, opts: any) =>
          new Promise((_resolve, _reject) => {
            // never resolves; AbortController should cancel
            if (opts?.signal) {
              opts.signal.addEventListener('abort', () => {
                _reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
              });
            }
          }),
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
  const client = new CostscopeClient({ ...mock, timeoutMs: 10, retry: { maxAttempts: 1 } });
    await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('does not retry on 400 error', async () => {
    const calls: number[] = [];
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async () => {
          calls.push(Date.now());
          return { ok: false, status: 400 } as any;
        },
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, retry: { maxAttempts: 3, backoffBaseMs: 1 } });
    await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: 'HTTP_ERROR', status: 400, attempt: 1 });
    expect(calls.length).toBe(1);
  });

  it('retries on network error (NETWORK_ERROR) then succeeds', async () => {
    const calls: number[] = [];
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async () => {
          calls.push(Date.now());
          if (calls.length < 2) {
            throw new Error('ECONNRESET');
          }
          return { ok: true, json: async () => [{ date: '2025-01-01', cost: 2 }] } as any;
        },
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, retry: { maxAttempts: 3, backoffBaseMs: 1 } });
    const data = await client.getOverview('P1D');
    expect(data[0].cost).toBe(2);
    expect(calls.length).toBe(2);
  });

  it('retries timeout then gives up with TIMEOUT code', async () => {
    let aborts = 0;
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async (_url: string, opts: any) =>
          new Promise((_resolve, _reject) => {
            if (opts?.signal) {
              opts.signal.addEventListener('abort', () => {
                aborts += 1;
                _reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
              });
            }
          }),
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, timeoutMs: 5, retry: { maxAttempts: 2, backoffBaseMs: 1 } });
    await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: 'TIMEOUT', attempt: 2 });
    expect(aborts).toBe(2);
  });

  it('caches getOverview responses within TTL and refresh bypasses cache', async () => {
  clearCacheRecords();
    let calls = 0;
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async () => {
          calls += 1;
          return { ok: true, json: async () => [{ date: '2025-01-01', cost: calls }] } as any;
        },
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
  const client = new CostscopeClient({ ...mock, cacheTtlMs: 60_000, retry: { maxAttempts: 1 } });
    const first = await client.getOverview('P1D');
    const second = await client.getOverview('P1D');
    expect(first[0].cost).toBe(1);
    expect(second[0].cost).toBe(1); // cached
    expect(calls).toBe(1);
    const third = await client.getOverview('P1D', { refresh: true });
    expect(third[0].cost).toBe(2);
    expect(calls).toBe(2);
  const cacheEvents = getCacheRecords().filter(r => r.path.startsWith('/costs/daily'));
  // Expect sequence: miss (first), hit (second), refresh-bypass (third)
  const kinds = cacheEvents.map(e => e.kind);
  expect(kinds).toEqual(['miss', 'hit', 'refresh-bypass']);
  });

  it('allows manual cache invalidation (clear all)', async () => {
    let calls = 0;
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async () => {
          calls += 1;
          return { ok: true, json: async () => [{ date: '2025-01-01', cost: calls }] } as any;
        },
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, cacheTtlMs: 60_000 });
    // Warm two distinct cache entries (different period param -> different path key)
    await client.getOverview('P1D'); // call #1
    await client.getOverview('P7D'); // call #2
    // Re-hit both (should be cached)
    await client.getOverview('P1D');
    await client.getOverview('P7D');
    expect(calls).toBe(2);
    // Clear all cache entries
    client.invalidateCache();
    await client.getOverview('P1D'); // call #3 (re-fetched)
    await client.getOverview('P7D'); // call #4 (re-fetched)
    expect(calls).toBe(4);
  });

  it('invalidateCache(key) only removes specified entry', async () => {
    let calls: Record<string, number> = { P1D: 0, P7D: 0 };
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async (url: string) => {
          // Determine which period was requested based on query param
            const period = /period=([^&]+)/.exec(url)?.[1] as 'P1D' | 'P7D' | undefined;
          if (period && calls[period] !== undefined) {
            calls[period] += 1;
            return { ok: true, json: async () => [{ date: '2025-01-01', cost: calls[period] }] } as any;
          }
          return { ok: true, json: async () => [] } as any;
        },
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, cacheTtlMs: 60_000 });
    const buildPath = (p: string) => `/costs/daily?period=${p}`; // mirrors buildPath usage here because only period param

    // Prime both cache entries
    await client.getOverview('P1D'); // P1D fetch #1
    await client.getOverview('P7D'); // P7D fetch #1
    // Re-hit both (should be cached)
    await client.getOverview('P1D');
    await client.getOverview('P7D');
    expect(calls).toEqual({ P1D: 1, P7D: 1 });

    // Invalidate only P1D cache entry
    client.invalidateCache(buildPath('P1D'));
    await client.getOverview('P1D'); // P1D fetch #2 (should refetch)
    await client.getOverview('P7D'); // Should still be cached (no new fetch)
    expect(calls).toEqual({ P1D: 2, P7D: 1 });

    // Invalidate non-existent key (noop)
    client.invalidateCache('/costs/daily?period=P30D');
    await client.getOverview('P7D'); // still cached
    expect(calls).toEqual({ P1D: 2, P7D: 1 });
  });

  it('enableInternalCache=false makes every call hit fetch (no dedupe)', async () => {
    let calls = 0;
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async () => {
          calls += 1;
          return { ok: true, json: async () => [{ date: '2025-01-01', cost: calls }] } as any;
        },
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, enableInternalCache: false, cacheTtlMs: 60_000 });
    const first = await client.getOverview('P1D');
    const second = await client.getOverview('P1D');
    expect(first[0].cost).toBe(1);
    expect(second[0].cost).toBe(2); // not cached
    expect(calls).toBe(2);
  });

  it('enableInternalCache=true (default) still caches within TTL', async () => {
    let calls = 0;
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async () => {
          calls += 1;
          return { ok: true, json: async () => [{ date: '2025-01-01', cost: calls }] } as any;
        },
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, cacheTtlMs: 60_000 }); // default enableInternalCache=true
    await client.getOverview('P1D');
    await client.getOverview('P1D');
    expect(calls).toBe(1);
  });

  it('prefetchAll fetches core endpoints + summary/providers and conditional datasets with shared correlation id', async () => {
    const requested: string[] = [];
    const corrIds: Set<string> = new Set();
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async (_url: string, opts: any) => {
          requested.push(_url.replace('http://example', ''));
          if (opts?.headers?.['x-correlation-id']) {
            corrIds.add(opts.headers['x-correlation-id']);
          }
          // differentiate payloads by path
          if (_url.includes('/costs/daily')) return { ok: true, json: async () => [{ date: '2025-01-01', cost: 1 }] } as any;
          if (_url.includes('/breakdown')) return { ok: true, json: async () => [{ dim: 'Compute', cost: 2, deltaPct: 0.1 }] } as any;
          if (_url.includes('/alerts')) return { ok: true, json: async () => [{ id: 'a1', severity: 'info', message: 'hi' }] } as any;
          if (_url.includes('/costs/summary')) return { ok: true, json: async () => ({ period: 'P5D', totalCost: 5 }) } as any;
          if (_url.endsWith('/providers')) return { ok: true, json: async () => [{ id: 'aws', name: 'AWS' }] } as any;
          if (_url.includes('/datasets?project=')) return { ok: true, json: async () => [{ id: 'd1', provider: 'aws', periodStart: '2025-01-01', periodEnd: '2025-01-31', records: 10, status: 'ready' }] } as any;
          return { ok: true, json: async () => [] } as any;
        },
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, cacheTtlMs: 60_000 });
    const res = await client.prefetchAll({ period: 'P5D', project: 'projX' });
    expect(res.overview[0].cost).toBe(1);
    expect(res.breakdown[0].cost).toBe(2);
    expect(res.alerts[0].id).toBe('a1');
    expect(res.summary?.totalCost).toBe(5);
    expect(res.providers?.[0].id).toBe('aws');
    expect(res.datasets?.[0].id).toBe('d1');
    // ensure exactly one correlation id used
    expect(corrIds.size).toBe(1);
    // ensure endpoints requested
    expect(requested.some(p => p.startsWith('/costs/daily'))).toBe(true);
    expect(requested.some(p => p.startsWith('/breakdown'))).toBe(true);
    expect(requested.some(p => p.startsWith('/alerts'))).toBe(true);
    expect(requested.some(p => p.startsWith('/costs/summary'))).toBe(true);
    expect(requested.some(p => p === '/providers')).toBe(true);
    expect(requested.some(p => p.startsWith('/datasets?project='))).toBe(true);
    expect(res.correlationId).toBe([...corrIds][0]);
    expect(typeof res.durationMs).toBe('number');
  });

  it('prefetchAll uses cache on subsequent calls (no extra fetches within TTL)', async () => {
    const calls: Record<string, number> = { overview: 0, breakdown: 0, alerts: 0, summary: 0, providers: 0 };
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
        fetch: async (url: string) => {
      if (url.includes('/costs/daily')) { calls.overview += 1; return { ok: true, json: async () => [{ date: '2025-01-01', cost: 10 }] } as any; }
      if (url.includes('/breakdown')) { calls.breakdown += 1; return { ok: true, json: async () => [{ dim: 'Compute', cost: 20, deltaPct: 0 }] } as any; }
      if (url.includes('/alerts')) { calls.alerts += 1; return { ok: true, json: async () => [{ id: 'x', severity: 'warn', message: 'm' }] } as any; }
      if (url.includes('/costs/summary')) { calls.summary += 1; return { ok: true, json: async () => ({ period: 'P30D', totalCost: 1 }) } as any; }
      if (url.endsWith('/providers')) { calls.providers += 1; return { ok: true, json: async () => [] } as any; }
          return { ok: true, json: async () => [] } as any;
        },
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, cacheTtlMs: 60_000 });
    await client.prefetchAll({ period: 'P30D' });
    await client.prefetchAll({ period: 'P30D' });
    expect(calls).toEqual({ overview: 1, breakdown: 1, alerts: 1, summary: 1, providers: 1 });
  });
});

describe('CostscopeClient advanced retry/backoff & correlation', () => {
  it('applies exponential backoff with recordRetryAttempt tracking', async () => {
    clearRetryAttemptRecords();
    const origSetTimeout = global.setTimeout;
    const delays: number[] = [];
    jest.spyOn(global, 'setTimeout').mockImplementation(((handler: any, timeout?: any, ...args: any[]) => {
      if (typeof timeout === 'number' && timeout <= 1000) delays.push(timeout);
      return origSetTimeout(handler, timeout as any, ...args) as any;
    }) as any);
    let attempts = 0;
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: { fetch: async () => { attempts += 1; if (attempts < 3) throw new Error('ECONNRESET'); return { ok: true, json: async () => [] } as any; } },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, retry: { maxAttempts: 3, backoffBaseMs: 5 } });
    const res = await client.getOverview('P1D');
    expect(res).toEqual([]);
    expect(attempts).toBe(3);
    // Expect delays contained 5 then 10 (order not guaranteed w/ other timeouts but sequence should include)
  expect(delays).toEqual(expect.arrayContaining([5, 10]));
  const records = getRetryAttemptRecords();
  expect(records.some(r => r.path.includes('/costs/daily') && r.attempts === 3 && r.success === true)).toBe(true);
    (global.setTimeout as any).mockRestore();
  });

  it('propagates correlationId in errors and alerts (network error)', async () => {
    const postedErrors: any[] = [];
    const postedAlerts: any[] = [];
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: { fetch: async () => { throw new Error('ECONNRESET'); } },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
      errorApi: { post: (e: any) => { postedErrors.push(e); } },
      alertApi: { post: (a: any) => { postedAlerts.push(a); } },
    } as any;
    const client = new CostscopeClient({ ...mock, retry: { maxAttempts: 1 } });
    let err: any;
    try { await client.getOverview('P1D'); } catch (e) { err = e; }
    expect(err).toBeTruthy();
    expect(err.correlationId).toBeTruthy();
    expect(postedErrors[0].message).toContain(err.correlationId);
    expect(postedAlerts[0].message).toContain(err.correlationId);
  });

  it('returns VALIDATION_ERROR when schema validation fails', async () => {
    // Force runtime validation on and return invalid shape
    (process as any).env.COSTSCOPE_RUNTIME_VALIDATE = 'true';
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: { fetch: async () => ({ ok: true, json: async () => ({ not: 'an array' }) }) },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, retry: { maxAttempts: 1 } });
    await expect(client.getOverview('P1D')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    delete (process as any).env.COSTSCOPE_RUNTIME_VALIDATE;
  });

  it('logs schema hash only once when runtime validation enabled', async () => {
    (process as any).env.COSTSCOPE_RUNTIME_VALIDATE = 'true';
  // Reset validation logging flags in case another test already loaded schemas
  (await import('./validation')).__resetValidationLoggingForTest();
  const logs: string[] = [];
  const logger = await import('../utils/logger');
  const origInfo = logger.info;
  (logger as any).info = (msg: any, ...rest: any[]) => { logs.push(String(msg)); origInfo.call(logger, msg, ...rest); };
    try {
      const mock = {
        discoveryApi: { getBaseUrl: async () => 'http://example' },
        fetchApi: { fetch: async (_url: string) => ({ ok: true, json: async () => [] }) },
        identityApi: { getCredentials: async () => ({ token: 't' }) },
      } as any;
      const client = new CostscopeClient({ ...mock, retry: { maxAttempts: 1 } });
  await client.getOverview('P1D');
  // Allow any deferred ensureSchemas logging microtasks to flush
  await Promise.resolve();
      await client.getBreakdown('ServiceCategory', 'P1D');
      const schemaLogs = logs.filter(l => l.includes('[Costscope Validation] schemaHash='));
      expect(schemaLogs.length).toBe(1);
    } finally {
  (logger as any).info = origInfo;
      delete (process as any).env.COSTSCOPE_RUNTIME_VALIDATE;
    }
  });

  it('does not log schema hash in production mode', async () => {
    const origNodeEnv = (process as any).env.NODE_ENV;
    (process as any).env.NODE_ENV = 'production';
    (process as any).env.COSTSCOPE_RUNTIME_VALIDATE = 'true';
    const logs: string[] = [];
  // eslint-disable-next-line no-console
  const origInfo = console.info;
    (console as any).info = (msg: any, ...rest: any[]) => { logs.push(String(msg)); origInfo.call(console, msg, ...rest); };
    try {
      const mock = {
        discoveryApi: { getBaseUrl: async () => 'http://example' },
        fetchApi: { fetch: async (_url: string) => ({ ok: true, json: async () => [] }) },
        identityApi: { getCredentials: async () => ({ token: 't' }) },
      } as any;
      const client = new CostscopeClient({ ...mock, retry: { maxAttempts: 1 } });
      await client.getOverview('P1D');
      const schemaLogs = logs.filter(l => l.includes('[Costscope Validation] schemaHash='));
      expect(schemaLogs.length).toBe(0);
    } finally {
      (console as any).info = origInfo;
      if (origNodeEnv === undefined) delete (process as any).env.NODE_ENV; else (process as any).env.NODE_ENV = origNodeEnv;
      delete (process as any).env.COSTSCOPE_RUNTIME_VALIDATE;
    }
  });

  it('aborts previous in-flight request on refresh to avoid race', async () => {
    let aborts = 0;
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
    fetchApi: {
  fetch: jest.fn(async (_url: string, opts: any) => {
          if (mock.fetchApi.fetch.mock.calls.length === 1) {
            return new Promise<any>((resolve, reject) => {
               const timer = setTimeout(() => resolve({ ok: true, json: async () => [{ date: '2025-01-01', cost: 1 }] }), 200);
              if (opts?.signal) {
                opts.signal.addEventListener('abort', () => {
                  aborts += 1;
                  clearTimeout(timer);
                  reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
                });
              }
            });
          }
          return { ok: true, json: async () => [{ date: '2025-01-01', cost: 2 }] } as any;
        }),
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, cacheTtlMs: 60_000 });
  client.getOverview('P1D'); // first request (ignore promise; ensure it does not win race)
  // Allow first request to progress to the point where AbortController is registered
  await Promise.resolve();
  await Promise.resolve();
  // Trigger refresh which should abort p1
    const p2 = client.getOverview('P1D', { refresh: true });
    const res2 = await p2; // should resolve with cost=2 (fresh second call)
    expect(res2[0].cost).toBe(2);
  expect(aborts).toBeGreaterThanOrEqual(1); // previous controller aborted (no stale overwrite)
  });

  it('ignores stale response when older request not aborted but finishes later (timestamp guard)', async () => {
    // Simulate backend that ignores abort (never fires abort event) so first request resolves after refresh.
    // We expect cache to contain fresh (second) response and late first response to be discarded.
    let firstResolve: ((v: any) => void) | undefined;
    const mock = {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: {
  fetch: jest.fn(async (_url: string) => {
          if (mock.fetchApi.fetch.mock.calls.length === 1) {
            return new Promise<any>(resolve => {
              firstResolve = resolve; // capture to resolve later
              // Intentionally ignore AbortController signal (simulate server ignoring abort)
            });
          }
          return { ok: true, json: async () => [{ date: '2025-01-01', cost: 99 }] } as any;
        }),
      },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
    } as any;
    const client = new CostscopeClient({ ...mock, cacheTtlMs: 60_000 });
    const p1 = client.getOverview('P1D');
    await Promise.resolve(); // allow setup
    const resFreshPromise = client.getOverview('P1D', { refresh: true });
    const fresh = await resFreshPromise;
    expect(fresh[0].cost).toBe(99);
    // Now resolve the first (stale) request with a different cost; it should be ignored.
    firstResolve?.({ ok: true, json: async () => [{ date: '2025-01-01', cost: 1 }] });
    // Await p1 (should resolve but not override cache)
    const stale = await p1;
    expect(stale).toEqual([{ date: '2025-01-01', cost: 1 }]);
    // Subsequent cached call should still return cost 99 (stale ignored)
    const after = await client.getOverview('P1D');
    expect(after[0].cost).toBe(99);
  });
});
