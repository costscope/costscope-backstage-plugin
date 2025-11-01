import { validateIfEnabled, runtimeValidationEnabled } from './validation';

describe('validation happy path', () => {
  const prev = { ...process.env };
  beforeAll(() => { process.env.COSTSCOPE_RUNTIME_VALIDATE = 'true'; });
  afterAll(() => { process.env = prev as any; });
  it('valid overview passes', async () => {
    if (!runtimeValidationEnabled()) return;
    await expect(validateIfEnabled('/costs/daily?period=P7D', [{ date: '2024-01-01', cost: 1 }], 1, 'c')).resolves.toBeUndefined();
  });
});
