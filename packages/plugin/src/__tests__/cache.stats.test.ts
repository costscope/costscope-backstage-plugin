import { InternalCache } from './cache';
import { clearCacheRecords } from './retryTelemetry';

jest.useFakeTimers();

describe('cache stats', () => {
  afterAll(() => {
    jest.useRealTimers();
  });
  it('aggregates hit/miss/stale/revalidate counters', async () => {
    clearCacheRecords();
    let value = 1;
    const fetcher = async () => ({ v: value });
    const cache = new InternalCache(
      fetcher,
      () => ({ cacheTtlMs: 30, swr: { enabled: true, staleFactor: 2 } }),
      () => true,
    );
    // miss
    const first = (await cache.get('/a')) as any;
    expect(first.v).toBe(1);
    // hit
    const second = (await cache.get('/a')) as any;
    expect(second.v).toBe(1);
    // serve stale + revalidate success
    value = 2;
    jest.advanceTimersByTime(40); // beyond soft TTL (30) but before hard expiry (60)
    const stale = (await cache.get('/a')) as any;
    expect(stale.v).toBe(1);
    // allow background revalidation promise to resolve
    await Promise.resolve();
    await Promise.resolve();
    const stats = cache.getCacheStats();
    expect(stats).toEqual({
      keys: 1,
      hits: 1,
      misses: 1,
      staleServes: 1,
      revalidateSuccess: 1,
      revalidateError: 0,
    });
  });
});
