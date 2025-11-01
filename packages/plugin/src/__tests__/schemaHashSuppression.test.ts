import { CostscopeClient } from './client';
import { DEFAULT_SERVICE_ID } from './constants';

// Mock discovery + fetch + identity
const discoveryApi = { getBaseUrl: async () => 'http://example.com' } as any;
const fetchApi = {
  fetch: async (_url: string) => ({ ok: true, json: async () => [] }),
} as any;
const identityApi = { getCredentials: async () => ({ token: 't' }) } as any;
const errorApi = { post: jest.fn() } as any;
const alertApi = { post: jest.fn() } as any;

describe('schema hash logging suppression', () => {
  beforeAll(() => {
    (process as any).env.COSTSCOPE_RUNTIME_VALIDATE = 'true';
    (process as any).env.NODE_ENV = 'development';
    (process as any).env.COSTSCOPE_LOG_VALIDATION_HASH = 'false';
  });
  afterAll(() => {
    delete (process as any).env.COSTSCOPE_LOG_VALIDATION_HASH;
  });
  test('does not log schema hash when suppression flag is false', async () => {
    const client = new CostscopeClient({
      discoveryApi,
      fetchApi,
      identityApi,
      errorApi,
      alertApi,
      serviceId: DEFAULT_SERVICE_ID,
    });
    const infoSpy = jest.spyOn(global.console, 'info').mockImplementation(() => {});
    await client.getOverview('P7D');
    const infoLogs = infoSpy.mock.calls.filter(c => /schemaHash=/.test(c[0]));
    expect(infoLogs.length).toBe(0);
    infoSpy.mockRestore();
  });
});
