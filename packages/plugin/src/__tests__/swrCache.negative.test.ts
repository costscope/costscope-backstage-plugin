import { maybeServeStale, type SwrState } from './swrCache';

describe('swrCache (negative)', () => {
  it('returns undefined when entry has no value', () => {
    const entry: SwrState<any> = { expires: Date.now() - 100, startedAt: Date.now() - 200 } as any;
    const events: any[] = [];
    const res = maybeServeStale(entry, '/k', Date.now(), 1000, { enabled: true, staleFactor: 2 }, () => { throw new Error('should not trigger'); }, e => events.push(e));
    expect(res).toBeUndefined();
    expect(events).toHaveLength(0);
  });
});
