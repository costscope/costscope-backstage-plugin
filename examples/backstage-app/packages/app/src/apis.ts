import {
  AnyApiFactory,
  configApiRef,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
  errorApiRef,
  alertApiRef,
} from '@backstage/core-plugin-api';
import { costscopeApiRef, createCostscopeClient } from '@costscope/backstage-plugin';

// Only provide Costscope API factory; identity is supplied by createApp defaults.
// Discovery is configured via app-config.local.yaml

export const apis: AnyApiFactory[] = [
  createApiFactory({
    api: costscopeApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      fetchApi: fetchApiRef,
      identityApi: identityApiRef,
      errorApi: errorApiRef,
      alertApi: alertApiRef,
      configApi: configApiRef,
    },
    factory: ({ discoveryApi, fetchApi, identityApi, errorApi, alertApi, configApi }) =>
      createCostscopeClient(configApi, {
        discoveryApi,
        fetchApi,
        identityApi,
        errorApi,
        alertApi,
        enableInternalCache: false,
      }),
  }),
];

// Intentionally no runtime console/logging in example app wiring
