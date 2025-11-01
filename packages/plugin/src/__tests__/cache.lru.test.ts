import { InternalCache } from './cache';

jest.useFakeTimers();

describe('InternalCache LRU eviction', () => {
  afterAll(() => {
    jest.useRealTimers();
  });
  it('evicts oldest entry when exceeding maxEntries', async () => {
    const calls: Record<string, number> = {};
    const fetcher = async (path: string) => { calls[path] = (calls[path] || 0) + 1; return { p: path, v: calls[path] }; };
    const cache = new InternalCache(
      fetcher as any,
      () => ({ cacheTtlMs: 10_000, maxEntries: 2, swr: { enabled: false, staleFactor: 2 } }),
      () => true,
    );
    await cache.get('/a'); // miss -> store A
    await cache.get('/b'); // miss -> store B
    await cache.get('/c'); // miss -> store C, should evict A (oldest)
    expect(Object.keys(calls)).toEqual(['/a', '/b', '/c']);
    await cache.get('/b'); // hit (no new fetch)
    await cache.get('/a'); // should be miss again (evicted earlier)
    expect(calls['/a']).toBe(2); // fetched twice due to eviction
    expect(calls['/b']).toBe(1); // not evicted
  });

  it('touch promotes key so the other one evicts', async () => {
    const calls: Record<string, number> = {};
    const fetcher = async (path: string) => { calls[path] = (calls[path] || 0) + 1; return path; };
    const cache = new InternalCache(
      fetcher as any,
      () => ({ cacheTtlMs: 10_000, maxEntries: 2, swr: { enabled: false, staleFactor: 2 } }),
      () => true,
    );
    await cache.get('/a');
    await cache.get('/b');
    // access /a to mark it MRU
    await cache.get('/a');
    await cache.get('/c'); // should evict /b now (was LRU)
    await cache.get('/b'); // refetch -> miss due to eviction
    expect(calls['/b']).toBe(2);
    expect(calls['/a']).toBe(1); // not refetched (still resident)
  });
});
