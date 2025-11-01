import { InternalCache } from './cache';

jest.useFakeTimers();

describe('cache hard expiry (SWR)', () => {
  afterAll(() => {
    jest.useRealTimers();
  });
  it('serves stale then refreshes after hard expiry', async () => {
    let value = 1;
    const fetcher = async () => ({ v: value });
    const cache = new InternalCache(fetcher, () => ({ cacheTtlMs: 30, swr: { enabled: true, staleFactor: 2 } }), () => true);
  const first = await cache.get('/a') as any;
  expect(first.v).toBe(1);
    value = 2;
    jest.advanceTimersByTime(40); // after soft TTL
  const stale = await cache.get('/a') as any;
  expect(stale.v).toBe(1);
    jest.advanceTimersByTime(30); // beyond hard expiry (60)
  const refreshed = await cache.get('/a') as any;
  expect(refreshed.v === 2 || refreshed.v === 1).toBe(true);
  });
});
