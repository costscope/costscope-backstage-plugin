import { CostscopeClient } from './client';

describe('CostscopeClient config merge (app-config low priority)', () => {
  function base(deps: Partial<any> = {}) {
    return {
      discoveryApi: { getBaseUrl: async () => 'http://example' },
      fetchApi: { fetch: async () => ({ ok: true, json: async () => [] }) },
      identityApi: { getCredentials: async () => ({ token: 't' }) },
      ...deps,
    } as any;
  }

  it('uses app-config defaults when constructor options omitted', async () => {
    const configApi = {
      getOptionalNumber: (path: string) => {
        switch (path) {
          case 'costscope.client.timeoutMs': return 1234;
          case 'costscope.client.retry.maxAttempts': return 5;
          case 'costscope.client.retry.backoffBaseMs': return 321;
          case 'costscope.client.cacheTtlMs': return 42_000;
          default: return undefined;
        }
      },
      getOptionalConfigArray: (path: string) => {
        if (path === 'costscope.client.retry.retryOn') return [502, 599];
        return undefined;
      },
    };
    const client: any = new CostscopeClient({ ...base(), configApi });
    // Access private cfg via cast (test only)
    const cfg = client['cfg']();
    expect(cfg.timeoutMs).toBe(1234);
    expect(cfg.cacheTtlMs).toBe(42_000);
  expect(cfg.retry.maxAttempts).toBe(5);
  expect(cfg.retry.backoffBaseMs).toBe(321);
  expect(cfg.retry.retryOn).toEqual([502, 599]);
  expect(cfg.retry.jitterFactor).toBe(0);
  });

  it('constructor options override app-config values', async () => {
    const configApi = {
      getOptionalNumber: (path: string) => {
        switch (path) {
          case 'costscope.client.timeoutMs': return 9999; // should be overridden
          case 'costscope.client.retry.maxAttempts': return 9; // overridden
          case 'costscope.client.retry.backoffBaseMs': return 888; // overridden
          case 'costscope.client.cacheTtlMs': return 77_000; // overridden
          default: return undefined;
        }
      },
      getOptionalConfigArray: (path: string) => {
        if (path === 'costscope.client.retry.retryOn') return [599];
        return undefined;
      },
    };
    const client: any = new CostscopeClient({
      ...base(),
      configApi,
      timeoutMs: 111,
      cacheTtlMs: 222,
      retry: { maxAttempts: 3, backoffBaseMs: 10, retryOn: [503] },
    });
    const cfg = client['cfg']();
    expect(cfg.timeoutMs).toBe(111); // explicit
    expect(cfg.cacheTtlMs).toBe(222);
  expect(cfg.retry.maxAttempts).toBe(3);
  expect(cfg.retry.backoffBaseMs).toBe(10);
  expect(cfg.retry.retryOn).toEqual([503]);
  expect(cfg.retry.jitterFactor).toBe(0);
  });

  it('enableInternalCache defaults to true when absent', async () => {
    const client: any = new CostscopeClient({ ...base() });
    expect(client['internalCacheEnabled']()).toBe(true);
  });

  it('enableInternalCache can be disabled via app-config', async () => {
    const configApi = {
      getOptionalBoolean: (path: string) => (path === 'costscope.client.enableInternalCache' ? false : undefined),
    };
    const client: any = new CostscopeClient({ ...base(), configApi });
    expect(client['internalCacheEnabled']()).toBe(false);
  });

  it('runtime enableInternalCache option takes priority over config true->false', async () => {
    const configApi = {
      getOptionalBoolean: (path: string) => (path === 'costscope.client.enableInternalCache' ? true : undefined),
    };
    const client: any = new CostscopeClient({ ...base(), configApi, enableInternalCache: false });
    expect(client['internalCacheEnabled']()).toBe(false);
  });

  it('runtime enableInternalCache option takes priority over config false->true', async () => {
    const configApi = {
      getOptionalBoolean: (path: string) => (path === 'costscope.client.enableInternalCache' ? false : undefined),
    };
    const client: any = new CostscopeClient({ ...base(), configApi, enableInternalCache: true });
    expect(client['internalCacheEnabled']()).toBe(true);
  });
});
