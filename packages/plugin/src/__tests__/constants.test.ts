import { resolveServiceId, DEFAULT_SERVICE_ID } from './constants';

describe('resolveServiceId', () => {
  it('returns override from configApi when provided', () => {
    const configApi = {
      getOptionalString: (path: string) => (path === 'costscope.serviceId' ? 'custom-service' : undefined),
    };
    expect(resolveServiceId(configApi)).toBe('custom-service');
  });

  it('falls back to DEFAULT_SERVICE_ID when no override provided', () => {
    const configApi = {
      getOptionalString: (_path: string) => undefined,
    };
    expect(resolveServiceId(configApi)).toBe(DEFAULT_SERVICE_ID);
  });

  it('falls back to DEFAULT_SERVICE_ID when configApi throws', () => {
    const configApi = {
      getOptionalString: (_path: string) => {
        throw new Error('boom');
      },
    };
    expect(resolveServiceId(configApi)).toBe(DEFAULT_SERVICE_ID);
  });
});
