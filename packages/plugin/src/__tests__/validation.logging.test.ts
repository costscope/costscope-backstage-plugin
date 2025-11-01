import { __resetValidationLoggingForTest, ensureSchemas, runtimeValidationEnabled } from './validation';
import * as logger from '../utils/logger';

// This test ensures the logging guard flags can be reset (test-only helper) so that
// subsequent validation initializations can emit schema hash exactly once again.

describe('__resetValidationLoggingForTest', () => {
  const origEnv = { ...process.env } as any;
  beforeEach(() => {
    process.env.COSTSCOPE_RUNTIME_VALIDATE = 'true';
    process.env.NODE_ENV = 'development';
    __resetValidationLoggingForTest();
  });
  afterAll(() => {
    process.env = origEnv;
  });
  it('allows schema hash log to re-emit once after reset', async () => {
    const logs: string[] = [];
  // eslint-disable-next-line no-console
  const origInfo = logger.info;
  (logger as any).info = (msg: any, ...rest: any[]) => { logs.push(String(msg)); origInfo.call(logger, msg, ...rest); };
    try {
      expect(runtimeValidationEnabled()).toBe(true);
      await ensureSchemas();
      await ensureSchemas(); // second call should not log again
      const firstBatch = logs.filter(l => l.includes('[Costscope Validation] schemaHash='));
      expect(firstBatch.length).toBe(1);
      __resetValidationLoggingForTest();
      await ensureSchemas();
      const secondBatch = logs.filter(l => l.includes('[Costscope Validation] schemaHash='));
      // After reset we expect exactly 2 logs total (one original + one after reset)
      expect(secondBatch.length).toBe(2);
    } finally {
  (logger as any).info = origInfo;
    }
  });
});
