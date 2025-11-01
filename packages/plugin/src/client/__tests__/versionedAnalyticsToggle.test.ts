import { CostscopeClient } from '../index';

// Mock http transport to capture requested paths without performing network calls
jest.mock('../core/transport', () => ({
  httpGet: jest.fn(async (path: string) => {
    // Return a shape that the client methods can unwrap without errors
    if (path.includes('/api/v1/analytics/trends')) return { trends: [] };
    if (path.includes('/api/v1/analytics/top-services')) return { top_services: [] };
    if (path.includes('/api/v1/analytics/summary')) return { summary: {} };
    return {};
  }),
}));

import { httpGet } from '../core/transport';

function makeClient() {
  // Minimal deps stubs; transport uses discoveryApi internally but we only validate path arg
  const opts: any = {
    discoveryApi: { getBaseUrl: async () => 'http://example.local' },
    fetchApi: { fetch: globalThis.fetch?.bind(globalThis) },
    identityApi: { getCredentials: async () => ({ token: 't' }) },
    experimental: { useVersionedAnalytics: true },
  };
  return new CostscopeClient(opts);
}

describe('CostscopeClient versioned analytics toggle', () => {
  beforeEach(() => {
    (httpGet as jest.Mock).mockClear();
  });

  it('calls trends endpoint with granularity=day', async () => {
    const client = makeClient();
    await client.getOverview('P7D', { project: 'demo' });
    expect(httpGet as jest.Mock).toHaveBeenCalled();
    const [path] = (httpGet as jest.Mock).mock.calls[0];
    expect(path).toContain('/api/v1/analytics/trends');
    expect(path).toContain('granularity=day');
    expect(path).toContain('period=P7D');
    expect(path).toContain('project=demo');
  });

  it('calls top-services with proper params', async () => {
    const client = makeClient();
    await client.getBreakdown('ServiceCategory', 'P14D', { project: 'x' });
    const [path] = (httpGet as jest.Mock).mock.calls.slice(-1)[0];
    expect(path).toContain('/api/v1/analytics/top-services');
    expect(path).toContain('by=ServiceCategory');
    expect(path).toContain('period=P14D');
    expect(path).toContain('project=x');
  });

  it('calls summary endpoint under toggle', async () => {
    const client = makeClient();
    await client.getSummary('P30D', { project: 'p' });
    const [path] = (httpGet as jest.Mock).mock.calls.slice(-1)[0];
    expect(path).toContain('/api/v1/analytics/summary');
    expect(path).toContain('period=P30D');
    expect(path).toContain('project=p');
  });
});
