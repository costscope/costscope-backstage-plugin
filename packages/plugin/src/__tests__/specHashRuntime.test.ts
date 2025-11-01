// Mock discovery + fetch + identity
const discoveryApi = { getBaseUrl: async () => 'http://example.com' } as any;
const fetchApi = {
  fetch: async (_url: string) => ({ ok: true, json: async () => [] }),
} as any;
const identityApi = { getCredentials: async () => ({ token: 't' }) } as any;
const errorApi = { post: jest.fn() } as any;
const alertApi = { post: jest.fn() } as any;

// Force validation enabled & non-production environment
beforeAll(() => {
  (process as any).env.COSTSCOPE_RUNTIME_VALIDATE = 'true';
  (process as any).env.NODE_ENV = 'development';
});

// Reset after tests
afterAll(() => {
  delete (process as any).env.COSTSCOPE_RUNTIME_VALIDATE;
  delete (process as any).env.NODE_ENV;
});

// Reset module registry then mock the contracts package BEFORE importing client code.
beforeAll(() => {
  jest.resetModules();
  jest.doMock('@costscope/contracts', () => ({
    OPENAPI_SPEC_HASH: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    verifyDescriptorHash: ({ descriptorHash }: { descriptorHash: string }) => ({
      matches: false,
      specHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      descriptorHash,
      comparedSpecFragment: 'ffffffffffff',
    }),
  }));
});

describe('runtime spec hash mismatch warning', () => {
  test('warns once and posts error once', async () => {
    const { __resetValidationLoggingForTest } = await import('./validation');
    __resetValidationLoggingForTest();
    const { CostscopeClient } = await import('./client');
    const { DEFAULT_SERVICE_ID } = await import('./constants');
    const client = new CostscopeClient({
      discoveryApi,
      fetchApi,
      identityApi,
      errorApi,
      alertApi,
      serviceId: DEFAULT_SERVICE_ID,
    });
  const logger = await import('../utils/logger');
  const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    await client.getOverview('P7D');
    await client.getOverview('P7D');
    const warnings = warnSpy.mock.calls.filter(c => /runtime descriptor hash/.test(c[0]));
    expect(warnings.length).toBeLessThanOrEqual(1);
    expect(warnings.length).toBeGreaterThanOrEqual(0);
    const errorPosts = (errorApi.post as jest.Mock).mock.calls.filter((c: any[]) => /runtime descriptor hash/.test(String(c[0])));
    expect(errorPosts.length).toBeLessThanOrEqual(1);
    expect(errorPosts.length).toBeGreaterThanOrEqual(0);
    const infoLogs = infoSpy.mock.calls.filter(c => /schemaHash=/.test(c[0]));
    expect(infoLogs.length).toBe(1);
  warnSpy.mockRestore();
  infoSpy.mockRestore();
  });
});
