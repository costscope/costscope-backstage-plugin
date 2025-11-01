import { test, expect } from '@playwright/test';
import { fetchJson } from './utils';

// @smoke quick verification that dataset search endpoint responds and minimal UI placeholder shows (if routed later)

const mockBase = process.env.MOCK_BASE || 'http://localhost:7100/api/costscope';

// This focuses on API readiness now; UI widget can hook later without changing smoke surface.

test.describe('Datasets search API smoke', () => {
  test('search endpoint returns deterministic array', async () => {
    const res = await fetchJson(`${mockBase}/datasets/search?project=foo&limit=5`, 200);
    expect(Array.isArray(res)).toBeTruthy();
    // Basic field sanity
    if (res.length) {
      const item = res[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('provider');
      expect(item).toHaveProperty('periodStart');
      expect(item).toHaveProperty('periodEnd');
    }
  });
});
