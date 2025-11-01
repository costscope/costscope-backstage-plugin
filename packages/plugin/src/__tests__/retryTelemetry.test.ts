import {
  recordRetryAttempt,
  getRetryAttemptRecords,
  clearRetryAttemptRecords,
  recordCacheEvent,
  getCacheRecords,
  clearCacheRecords,
} from './retryTelemetry';

describe('retryTelemetry', () => {
  beforeEach(() => {
    clearRetryAttemptRecords();
    clearCacheRecords();
    (globalThis as any).process = { env: { NODE_ENV: 'development' } } as any;
  });

  it('records and retrieves retry attempts in development', () => {
  recordRetryAttempt({ path: '/x', attempts: 2, success: true, durationMs: 123, overviewLength: 30, responseBytes: 4567, itemCount: 30 });
    const recs = getRetryAttemptRecords();
    expect(recs.length).toBe(1);
    expect(recs[0].path).toBe('/x');
    expect(recs[0].attempts).toBe(2);
  expect(recs[0].durationMs).toBe(123);
  expect(recs[0].overviewLength).toBe(30);
  expect(recs[0].responseBytes).toBe(4567);
  expect(recs[0].itemCount).toBe(30);
  });

  it('records cache events and can clear them', () => {
    recordCacheEvent({ path: '/y', kind: 'hit' });
    recordCacheEvent({ path: '/y', kind: 'miss' });
    const kinds = getCacheRecords().map(r => r.kind);
    expect(kinds).toEqual(['hit', 'miss']);
    clearCacheRecords();
    expect(getCacheRecords()).toEqual([]);
  });

  it('no-ops in production env', () => {
    (globalThis as any).process.env.NODE_ENV = 'production';
  recordRetryAttempt({ path: '/p', attempts: 1, success: true, durationMs: 5, responseBytes: 10, itemCount: 1 });
    recordCacheEvent({ path: '/p', kind: 'hit' });
    expect(getRetryAttemptRecords()).toEqual([]);
    expect(getCacheRecords()).toEqual([]);
  });
});
