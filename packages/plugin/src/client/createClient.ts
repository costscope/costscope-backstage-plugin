import { resolveServiceId } from '../constants';

import { CostscopeClient, type CostscopeClientOptions } from './index';

/**
 * Simplified factory for constructing a `CostscopeClient` outside plugin extension wiring.
 *
 * Service ID precedence (highest first):
 *  1. Explicit `overrides.serviceId`
 *  2. Value from `configApi` (`costscope.serviceId`)
 *  3. Internal default constant.
 */
/** @public */
export function createCostscopeClient(
  configApi: any,
  overrides?: Omit<CostscopeClientOptions, 'configApi'>,
) {
  const resolved = overrides?.serviceId || resolveServiceId(configApi);
  // If a direct baseUrl is provided via app-config, bypass discovery entirely by
  // supplying a tiny discoveryApi shim that always returns this base url.
  let eff: any = { ...(overrides as any) };
  try {
    const baseUrl = configApi?.getOptionalString?.('costscope.baseUrl');
    if (typeof baseUrl === 'string' && baseUrl.length > 0) {
      eff = {
        ...eff,
        discoveryApi: { async getBaseUrl() { return baseUrl; } },
      };
    }
  } catch {
    // ignore config read errors and fall back to provided discoveryApi
  }
  return new CostscopeClient({ ...eff, serviceId: resolved, configApi });
}

export type { CostscopeClientOptions } from './index';
