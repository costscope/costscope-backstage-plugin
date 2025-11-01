import { recordValidationEvent, clearValidationRecords } from './validationTelemetry';

describe('validationTelemetry metrics', () => {
  beforeAll(() => {
    (process as any).env.NODE_ENV = 'development';
  });
  afterEach(() => {
    clearValidationRecords();
    delete (globalThis as any).__COSTSCOPE_DEBUG_VALIDATION;
    delete (globalThis as any).__COSTSCOPE_VALIDATION_METRICS;
    delete (process as any).env.COSTSCOPE_DEV_METRICS;
    delete (process as any).env.COSTSCOPE_DEV_METRICS_FILE;
  });

  it('updates global metrics snapshot with failure rate', () => {
    recordValidationEvent({ path: '/costs/daily', success: true, durationMs: 1, schema: 'overview', schemaHash: 'h' });
    recordValidationEvent({ path: '/alerts', success: false, durationMs: 1, schema: 'alerts', schemaHash: 'h' });
    const m = (globalThis as any).__COSTSCOPE_VALIDATION_METRICS;
    expect(m.total).toBe(2);
    expect(m.failures).toBe(1);
    expect(m.failureRate).toBeCloseTo(0.5, 5);
    expect(m.by.overview.total).toBe(1);
    expect(m.by.alerts.failures).toBe(1);
  });

  it('optionally persists metrics when env flag set', async () => {
    (process as any).env.COSTSCOPE_DEV_METRICS = 'true';
  (process as any).env.COSTSCOPE_DEV_METRICS_FILE = require('path').join(process.cwd(), 'temp', `validation-metrics.test.json`);
    recordValidationEvent({ path: '/alerts', success: false, durationMs: 1, schema: 'alerts', schemaHash: 'h' });
    // give the async write a tick
    await new Promise(r => setTimeout(r, 5));
  const fs = await import('fs');
    const p = (process as any).env.COSTSCOPE_DEV_METRICS_FILE;
    expect(fs.existsSync(p)).toBe(true);
    const content = JSON.parse(fs.readFileSync(p, 'utf8'));
    expect(content.metrics.failures).toBeGreaterThanOrEqual(1);
  });
});
