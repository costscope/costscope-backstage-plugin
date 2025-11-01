/**
 * Tests for initRuntimeValidation memoization and conditional dynamic import.
 */

describe('initRuntimeValidation()', () => {
  const prevEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...prevEnv, NODE_ENV: 'test' } as any;
  });

  afterAll(() => {
    process.env = prevEnv;
  });

  it('memoizes the dynamic import when enabled (same promise returned)', async () => {
    process.env.COSTSCOPE_RUNTIME_VALIDATE = 'true';
    const { initRuntimeValidation } = await import('./initRuntimeValidation');
    const p1 = initRuntimeValidation();
    const p2 = initRuntimeValidation();
    expect(p1).toBe(p2);
    const vmod: any = await p1;
    expect(vmod).toBeDefined();
    expect(typeof vmod.validateIfEnabled).toBe('function');
  });

  it('returns a memoized resolved-undefined when disabled', async () => {
    process.env.COSTSCOPE_RUNTIME_VALIDATE = 'false';
    const { initRuntimeValidation } = await import('./initRuntimeValidation');
    const p1 = initRuntimeValidation();
    const p2 = initRuntimeValidation();
    expect(p1).toBe(p2);
    await expect(p1).resolves.toBeUndefined();
  });
});
