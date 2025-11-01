import { test, expect } from '@playwright/test';

// @smoke Verify the frontend requests the correct /api/costscope/* endpoints
// and that each endpoint returns the expected JSON shape (not just 200).

test.describe('@smoke endpoints and payload shape via frontend', () => {
  test('requests expected endpoints with valid JSON payloads', async ({ page }) => {
    const requests: string[] = [];
    const payloads: Record<string, any> = {};

    page.on('response', async (res) => {
      const url = res.url();
      if (!url.includes('/api/costscope/')) return;
      requests.push(url);
      try {
        // Best-effort JSON parse; some endpoints may not be JSON on error paths
        const json = await res.json().catch(() => undefined);
        if (json !== undefined) payloads[url] = json;
      } catch {
        /* ignore parse errors to keep test resilient */
      }
    });

    // Navigate to plugin page; handle optional guest sign-in
    await page.goto('/costscope');
    const guestButton = page.getByRole('button', { name: /guest|enter as guest|sign in|enter/i }).first();
    try { if (await guestButton.isVisible({ timeout: 4000 })) await guestButton.click(); } catch { /* optional */ }

    // Wait for page to render root; then allow API calls to flush
    await page.getByTestId('costscope-page-root').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1500);

    const findUrl = (suffix: string) => requests.find(u => u.includes(suffix));

    // Providers
    const providersUrl = findUrl('/api/costscope/providers');
    expect(providersUrl, 'providers endpoint was requested').toBeTruthy();
    const providers = providersUrl ? payloads[providersUrl] : undefined;
    expect(Array.isArray(providers), 'providers returns array').toBe(true);
    if (Array.isArray(providers) && providers.length) {
      expect(providers[0]).toHaveProperty('id');
    }

    // Daily costs
    const dailyUrl = findUrl('/api/costscope/costs/daily');
    expect(dailyUrl, 'costs/daily endpoint was requested').toBeTruthy();
    const daily = dailyUrl ? payloads[dailyUrl] : undefined;
    expect(Array.isArray(daily) && daily.length > 0, 'daily returns non-empty array').toBe(true);

    // Summary
    const summaryUrl = findUrl('/api/costscope/costs/summary');
    expect(summaryUrl, 'costs/summary endpoint was requested').toBeTruthy();
    const summary = summaryUrl ? payloads[summaryUrl] : undefined;
    expect(summary, 'summary returns object').toBeTruthy();
    if (summary) {
      expect(summary).toHaveProperty('totalCost');
    }

    // Breakdown
    const breakdownUrl = findUrl('/api/costscope/breakdown');
    expect(breakdownUrl, 'breakdown endpoint was requested').toBeTruthy();
    const breakdown = breakdownUrl ? payloads[breakdownUrl] : undefined;
    expect(Array.isArray(breakdown) && breakdown.length > 0, 'breakdown returns non-empty array').toBe(true);

    // Alerts (optional in UI path; only assert shape if present)
    const alertsUrl = findUrl('/api/costscope/alerts');
    if (alertsUrl) {
      const alerts = payloads[alertsUrl];
      expect(Array.isArray(alerts), 'alerts returns array when requested').toBe(true);
    }
  });
});
