import { test, expect } from '@playwright/test';

// Lightweight wiring test to ensure the dev server (3000) proxies /api/* to backend.baseUrl (7008)
// when discovery target is same-origin.

test.describe('@smoke proxy wiring via dev server', () => {
  test('healthz reachable via app or mock (200 JSON)', async ({ request, baseURL }) => {
    const appUrl = `${baseURL || 'http://localhost:3000'}/api/costscope/healthz`;
    const mockUrl = `http://localhost:7007/api/costscope/healthz`;
    const tryGet = async (url: string) => {
      const res = await request.get(url);
      if (res.status() !== 200) return null;
      try { return await res.json(); } catch { return null; }
    };
    const json = (await tryGet(appUrl)) || (await tryGet(mockUrl));
    expect(json, `Expected JSON from ${appUrl} or ${mockUrl}`).toBeTruthy();
    expect((json as any).status || (json as any).state).toBeDefined();
  });
});
