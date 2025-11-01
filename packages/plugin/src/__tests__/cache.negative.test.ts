import { InternalCache } from './cache';

describe('cache (negative)', () => {
  it('does not retain failed entry', async () => {
    let calls = 0;
    const fetcher = async () => { calls += 1; if (calls === 1) throw new Error('boom'); return 'ok'; };
    const cache = new InternalCache(fetcher, () => ({ cacheTtlMs: 1000, swr: { enabled: false, staleFactor: 2 } }), () => true);
    await expect(cache.get('/x')).rejects.toThrow('boom');
    const v = await cache.get('/x');
    expect(v).toBe('ok');
    expect(calls).toBe(2);
  });
});
