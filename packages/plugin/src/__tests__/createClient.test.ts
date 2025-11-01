import { createCostscopeClient } from './client/createClient';

const baseDeps = () => ({ discoveryApi: {}, fetchApi: {}, identityApi: {} });

describe('createCostscopeClient', () => {
  it('resolves serviceId from config when not overridden', () => {
    const configApi = { getOptionalString: (p: string) => (p === 'costscope.serviceId' ? 'cfg-id' : undefined) };
    const client: any = createCostscopeClient(configApi, baseDeps());
    expect(client.impl.transportDeps.serviceId).toBe('cfg-id');
  });

  it('prefers explicit override over config', () => {
    const configApi = { getOptionalString: () => 'cfg-id' };
    const client: any = createCostscopeClient(configApi, { ...baseDeps(), serviceId: 'override-id' });
    expect(client.impl.transportDeps.serviceId).toBe('override-id');
  });
});
