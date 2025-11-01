import { test, expect } from '@playwright/test';

// Minimal smoke test that targets an already running preview host of the minimal app.
// It intentionally avoids the repository's globalSetup so it can point to any external URL.

const PREVIEW_BASE = process.env.PREVIEW_BASE || 'http://localhost:5190/costscope-backstage-plugin/minimal';

test.describe('Manual preview smoke (@smoke)', () => {
  test.beforeAll(async () => {
    if (!PREVIEW_BASE) {
      test.skip(true, 'PREVIEW_BASE not provided');
    }
  });

  test('@smoke loads minimal app costscope page and renders breakdown table', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', m => consoleMessages.push(`${m.type()}: ${m.text()}`));
    page.on('pageerror', e => consoleMessages.push(`pageerror: ${e.message}`));
    const target = `${PREVIEW_BASE.replace(/\/$/, '')}/costscope`;
    await page.goto(target);

  const root = page.locator('[data-testid="costscope-page-root"]').first();
  await expect(root).toBeVisible({ timeout: 30_000 });

    // No visible cards with text "Error"
    const errorCards = page.locator('[data-testid="costscope-page-root"] .MuiCard-root:has-text("Error")');
    try {
      await expect(errorCards).toHaveCount(0);
    } catch (e) {
      console.log('[manual-preview] console logs before failure:\n' + consoleMessages.join('\n'));
      throw e;
    }
  });
});
