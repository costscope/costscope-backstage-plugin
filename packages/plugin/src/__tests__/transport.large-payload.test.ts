/**
 * Purpose: exercise the large payload warning branch in transport.ts to raise coverage.
 * We don't assert on console output (side-effect only); success simply means the request resolves.
 */
import { httpGet } from './transport';

// Minimal mocks for required deps
const discoveryApi: any = { getBaseUrl: async () => 'http://example.com/api/costscope' };
const identityApi: any = { getCredentials: async () => ({ token: 't' }) };
const alertApi: any = { post: jest.fn() };
const errorApi: any = { post: jest.fn() };

function makeFetch(bigArray: any[]) {
  return async (input: any): Promise<any> => {
    const url = new URL(input.toString());
    if (url.pathname.includes('/costs/daily')) {
      return { ok: true, status: 200, json: async () => bigArray };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

describe('transport large payload warning', () => {
  it('handles very large JSON payload without throwing', async () => {
    // Create >1MB JSON string quickly: 70k simple objects ~ >1MB once stringified
    const bigArray = Array.from({ length: 70000 }, (_, i) => ({ date: `2024-01-${(i % 30) + 1}`.padStart(10, '0'), cost: i }));
  const fetchApi = { fetch: makeFetch(bigArray) } as any;
    const result = await httpGet<any[]>(
      '/costs/daily?period=P30D',
      { timeoutMs: 5000, retry: { maxAttempts: 1, retryOn: [], backoffBaseMs: 1 } },
      { discoveryApi, fetchApi, identityApi, alertApi, errorApi, largePayloadWarnedPaths: new Set(), silent: true },
      'corr-large'
    );
    expect(result.length).toBe(70000);
  });
});
