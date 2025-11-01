import { __resetValidationLoggingForTest, runtimeValidationEnabled, computeSchemaHash, ensureSchemas } from '../client/validation/validation';

describe('validation runtime helpers', () => {
  beforeEach(() => {
    // Ensure clean env for each test
    delete (globalThis as any).__COSTSCOPE_VD;
    delete (globalThis as any).__COSTSCOPE_RESET_VALIDATION_LOGGING__;
    process.env.COSTSCOPE_RUNTIME_VALIDATE = 'false';
  });

  it('runtimeValidationEnabled reads env flag', () => {
    process.env.COSTSCOPE_RUNTIME_VALIDATE = 'true';
    expect(runtimeValidationEnabled()).toBe(true);
    process.env.COSTSCOPE_RUNTIME_VALIDATE = 'false';
    expect(runtimeValidationEnabled()).toBe(false);
  });

  it('computeSchemaHash falls back to default and reads injected module', () => {
    // without injected module
    expect(computeSchemaHash()).toBe('00000000');
    // inject module
    (globalThis as any).__COSTSCOPE_VD = { VALIDATION_DESCRIPTOR_HASH: 'abc12345' };
    expect(computeSchemaHash()).toBe('abc12345');
  });

  it('ensureSchemas exits early when runtimeValidation disabled', async () => {
    process.env.COSTSCOPE_RUNTIME_VALIDATE = 'false';
    const res = await ensureSchemas(undefined, false);
    expect(res).toBeUndefined();
  });

  it('ensureSchemas warns on spec drift when hashes differ', async () => {
    process.env.COSTSCOPE_RUNTIME_VALIDATE = 'true';
    // inject descriptor hash
    (globalThis as any).__COSTSCOPE_VD = { VALIDATION_DESCRIPTOR_HASH: 'zzzzzzzz' };
    // mock @costscope/contracts to report different fragment
    jest.unmock('@costscope/contracts');
    jest.mock('@costscope/contracts', () => ({ verifyDescriptorHash: ({ descriptorHash }: any) => ({ matches: false, comparedSpecFragment: 'deadbeef' }) }));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const schemas = await ensureSchemas(undefined, true);
      expect(schemas).toBeTruthy();
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
