import { validateIfEnabled, runtimeValidationEnabled } from './validation';
import { CostscopeErrorCodes } from './errorCodes';

describe('validation (negative)', () => {
  const prev = { ...process.env };
  beforeAll(() => { process.env.COSTSCOPE_RUNTIME_VALIDATE = 'true'; });
  afterAll(() => { process.env = prev as any; });
  it('throws VALIDATION_ERROR on invalid overview payload', async () => {
    if (!runtimeValidationEnabled()) return; // safety guard
    const bad = [{ date: '2024-01-01', cost: 'oops' }] as any;
    await expect(validateIfEnabled('/costs/daily?period=P30D', bad, 1, 'corr')).rejects.toMatchObject({ code: CostscopeErrorCodes.VALIDATION_ERROR });
  });
});
