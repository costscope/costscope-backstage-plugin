import { recordCacheEvent } from './telemetry';
import { getCacheRecords, clearCacheRecords } from './retryTelemetry';

describe('telemetry (negative)', () => {
  const prev = process.env.NODE_ENV;
  beforeAll(() => { process.env.NODE_ENV = 'production'; clearCacheRecords(); });
  afterAll(() => { process.env.NODE_ENV = prev; });
  it('does not record events in production', () => {
    recordCacheEvent({ path: '/x', kind: 'hit' });
    expect(getCacheRecords()).toHaveLength(0);
  });
});
