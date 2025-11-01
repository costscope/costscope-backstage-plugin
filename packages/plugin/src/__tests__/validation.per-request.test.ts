import { validateIfEnabled, __resetValidationLoggingForTest } from './validation';
import { CostscopeErrorCodes } from './errorCodes';

describe('validation per-request override', () => {
  const prev = { ...process.env } as any;
  beforeEach(() => { process.env = { ...prev, COSTSCOPE_RUNTIME_VALIDATE: 'false', NODE_ENV: 'test' } as any; __resetValidationLoggingForTest(); });
  afterAll(() => { process.env = prev; });

  it('forces validation when env is false but validate=true', async () => {
    await expect(validateIfEnabled('/costs/daily?period=P7D', [{ date: '2024-01-01', cost: 1 }], 1, 'c', true)).resolves.toBeUndefined();
  });

  it('skips validation when env is true but validate=false', async () => {
    process.env.COSTSCOPE_RUNTIME_VALIDATE = 'true';
    // Pass invalid payload but override validate=false to skip
    await expect(validateIfEnabled('/costs/daily?period=P7D', [{ date: '2024-01-01', cost: 'x' }], 1, 'c', false)).resolves.toBeUndefined();
  });

  it('still throws when validate=true and payload invalid', async () => {
    await expect(validateIfEnabled('/breakdown?by=ServiceCategory', [{ dim: 'Compute', cost: 'nope', deltaPct: 0.1 }], 1, 'c', true)).rejects.toMatchObject({ code: CostscopeErrorCodes.VALIDATION_ERROR });
  });
});
