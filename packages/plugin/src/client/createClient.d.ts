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
export declare function createCostscopeClient(configApi: any, overrides?: Omit<CostscopeClientOptions, 'configApi'>): CostscopeClient;
export type { CostscopeClientOptions } from './index';
