import { recordValidationEvent, getValidationRecords, clearValidationRecords, printValidationSummary } from './validationTelemetry';
import * as logger from '../utils/logger';

beforeAll(() => {
  (process as any).env.NODE_ENV = 'development';
});

afterAll(() => {
  delete (process as any).env.NODE_ENV;
});

afterEach(() => {
  clearValidationRecords();
  delete (globalThis as any).__COSTSCOPE_DEBUG_VALIDATION;
});

describe('validationTelemetry', () => {
  it('records success & error events and exposes them', () => {
    recordValidationEvent({ path: '/costs/daily?period=P7D', success: true, durationMs: 2, schema: 'overview', schemaHash: 'abc' });
    recordValidationEvent({ path: '/breakdown?by=ServiceCategory', success: false, durationMs: 1, schema: 'breakdown', errorMessage: 'boom', schemaHash: 'def' });
    const recs = getValidationRecords();
    expect(recs.length).toBe(2);
    const ok = recs.find(r => r.success)!;
    const err = recs.find(r => !r.success)!;
    expect(ok.schema).toBe('overview');
    expect(err.errorMessage).toContain('boom');
  });

  it('prints summary table when debug flag enabled (with rows)', () => {
    for (let i = 0; i < 5; i += 1) {
      recordValidationEvent({ path: '/alerts', success: true, durationMs: i + 1, schema: 'alerts', schemaHash: 'xyz' });
    }
    (globalThis as any).__COSTSCOPE_DEBUG_VALIDATION = true;
  const tableSpy = jest.spyOn(logger, 'table').mockImplementation(() => {});
    printValidationSummary();
    expect(tableSpy).toHaveBeenCalledTimes(1);
    tableSpy.mockRestore();
  });

  it('logs info when no events and summary requested', () => {
    (globalThis as any).__COSTSCOPE_DEBUG_VALIDATION = true;
  const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    printValidationSummary();
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it('auto-prints every 25 events when debug flag enabled', () => {
    (globalThis as any).__COSTSCOPE_DEBUG_VALIDATION = true;
  const tableSpy = jest.spyOn(logger, 'table').mockImplementation(() => {});
    for (let i = 0; i < 25; i += 1) {
      recordValidationEvent({ path: `/costs/daily?i=${i}`, success: true, durationMs: 1, schema: 'overview', schemaHash: 'h' });
    }
    expect(tableSpy).toHaveBeenCalled();
    tableSpy.mockRestore();
  });

  it('attaches global helper costscopePrintValidationSummary', () => {
    expect(typeof (globalThis as any).costscopePrintValidationSummary).toBe('function');
    (globalThis as any).__COSTSCOPE_DEBUG_VALIDATION = true;
  const spy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    // Clear records to force "no events" branch and exercise helper
    clearValidationRecords();
    (globalThis as any).costscopePrintValidationSummary();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
