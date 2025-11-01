import { resolveRuntimeConfig } from './config/runtimeConfig';
import { DEFAULT_SERVICE_ID } from './constants';

function baseOptions(extra: any = {}) {
  return { discoveryApi: {}, fetchApi: {}, identityApi: {}, ...extra };
}

describe('runtime config precedence', () => {
  it('defaults when nothing provided', () => {
    const rc = resolveRuntimeConfig({ options: baseOptions() });
    expect(rc.serviceId).toBe(DEFAULT_SERVICE_ID);
    expect(rc.timeoutMs).toBe(10_000);
    expect(rc.cacheTtlMs).toBe(60_000);
  expect(rc.retry).toEqual({ maxAttempts: 3, backoffBaseMs: 200, retryOn: [502,503,504], jitterFactor: 0 });
    expect(rc.enableInternalCache).toBe(true);
    expect(rc.swr).toEqual({ enabled: false, staleFactor: 3 });
  });

  it('reads app-config values when constructor options absent', () => {
    const configApi = {
      getOptionalString: (p: string) => (p === 'costscope.serviceId' ? 'from-config' : undefined),
      getOptionalNumber: (p: string) => {
        switch (p) {
          case 'costscope.client.timeoutMs': return 1111;
          case 'costscope.client.cacheTtlMs': return 2222;
          case 'costscope.client.retry.maxAttempts': return 7;
          case 'costscope.client.retry.backoffBaseMs': return 321;
          default: return undefined;
        }
      },
      getOptionalConfigArray: (p: string) => (p === 'costscope.client.retry.retryOn' ? [599] : undefined),
      getOptionalBoolean: (p: string) => (p === 'costscope.client.enableInternalCache' ? false : undefined),
    };
    const rc = resolveRuntimeConfig({ options: baseOptions({ configApi }) });
    expect(rc.serviceId).toBe('from-config');
    expect(rc.timeoutMs).toBe(1111);
    expect(rc.cacheTtlMs).toBe(2222);
  expect(rc.retry).toEqual({ maxAttempts: 7, backoffBaseMs: 321, retryOn: [599], jitterFactor: 0 });
    expect(rc.enableInternalCache).toBe(false);
  });

  it('constructor options override app-config', () => {
    const configApi = {
      getOptionalString: () => 'ignored-config-id',
      getOptionalNumber: () => 9999,
      getOptionalConfigArray: () => [599],
      getOptionalBoolean: () => false,
    };
    const rc = resolveRuntimeConfig({ options: baseOptions({
      configApi,
      serviceId: 'runtime-id',
      timeoutMs: 123,
      cacheTtlMs: 456,
      enableInternalCache: true,
      retry: { maxAttempts: 2, backoffBaseMs: 50, retryOn: [504] },
      swr: { enabled: true, staleFactor: 5 },
    }) });
    expect(rc.serviceId).toBe('runtime-id');
    expect(rc.timeoutMs).toBe(123);
    expect(rc.cacheTtlMs).toBe(456);
  expect(rc.retry).toEqual({ maxAttempts: 2, backoffBaseMs: 50, retryOn: [504], jitterFactor: 1 });
    expect(rc.enableInternalCache).toBe(true); // overrides config false
    expect(rc.swr).toEqual({ enabled: true, staleFactor: 5 });
  });

  it('retryOn falls back to default when config empty array', () => {
    const configApi = { getOptionalConfigArray: () => [] };
    const rc = resolveRuntimeConfig({ options: baseOptions({ configApi }) });
    expect(rc.retry.retryOn).toEqual([502,503,504]);
  });

  it('staleFactor is clamped to >=1', () => {
    const rc = resolveRuntimeConfig({ options: baseOptions({ swr: { enabled: true, staleFactor: 0 } }) });
    expect(rc.swr.staleFactor).toBe(1);
  });
});
