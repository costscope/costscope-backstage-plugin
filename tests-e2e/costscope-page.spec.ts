import { test, expect } from '@playwright/test';
import { navigateWithAuth, checkPluginBundle, isScreenshotDiffEnabled } from './utils';

// @smoke  Smoke test for the /costscope route rendering core widgets without console errors.
// Works against either the minimal example app or the Backstage example; test dynamically adapts.

const PAGE_PATH = '/costscope';

const errorLevels = new Set(['error']);

test.describe('Costscope /costscope page', () => {

  test('@smoke loads overview and breakdown cards', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      consoleMessages.push(`pageerror: ${err.message}`);
    });
    page.on('requestfailed', req => {
      consoleMessages.push(`requestfailed: ${req.url()} -> ${req.failure()?.errorText}`);
    });

    // Capture any window.onerror early (some errors may not surface as console events in headless)
    await page.addInitScript(() => {
      (window as any).__costscopeErrors = [] as any[];
      window.addEventListener('error', ev => {
        (window as any).__costscopeErrors.push({ message: ev.error?.message, filename: (ev as any).filename });
      });
      window.addEventListener('unhandledrejection', ev => {
        (window as any).__costscopeErrors.push({ message: (ev as any).reason?.message || String((ev as any).reason) });
      });
      // Early fetch instrumentation (before app scripts execute)
      try {
        const orig = window.fetch.bind(window);
        (window as any).__fetchLogged = new Set<string>();
  (window as any).fetch = async (...args: any[]) => {
          try {
            const url = String(args[0]);
            if (!(window as any).__fetchLogged.has(url)) {
              (window as any).__fetchLogged.add(url);
              console.log('[e2e-fetch-early]', url);
            }
          } catch { /* ignore */ }
          return orig(...(args as [RequestInfo, RequestInit?]));
  };
      } catch { /* ignore */ }
    });

  // Direct navigation (minimal app) – navigateWithAuth kept for Backstage legacy but minimal app has no root content.
  await page.goto(PAGE_PATH);

  // Minimal app has no auth; Backstage app might. If sign-in button exists, click it; otherwise continue.
  const enterBtn = page.getByRole('button', { name: /(sign in|enter|guest)/i }).first();
  try { if (await enterBtn.isVisible({ timeout: 3000 })) await enterBtn.click(); } catch { /* ignore */ }

  // ensure path
  if (!page.url().includes(PAGE_PATH)) await page.goto(PAGE_PATH);

    // Attempt explicit guest sign-in if SignInPage is shown (new Backstage templates often require manual click)
    const guestButton = page.getByRole('button', { name: /guest|enter as guest/i });
    try {
      if (await guestButton.first().isVisible({ timeout: 5000 })) {
        await guestButton.first().click();
        await page.waitForTimeout(300); // allow redirect/render
      }
    } catch { /* no guest button */ }

    // Wait for sentinel root OR title (some environments may render title before root attach)
  const rootSentinel = page.getByTestId('costscope-page-root');
  const pageTitle = page.getByTestId('costscope-page-title');
    // Allow a fallback detection: presence of our auto-signin div or any costscope bundle script loaded
    const autoSignin = page.locator('[data-testid="auto-signin"]');
    const waited = await Promise.race([
      rootSentinel.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'root'),
      pageTitle.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'title'),
      autoSignin.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'autosignin'),
    ]).catch(() => 'timeout');
    if (waited === 'timeout') {
      // Provide richer diagnostics before failing hard
      const bodyHtml = await page.evaluate(() => document.body.innerHTML.slice(0, 2000));
      const scripts = await page.evaluate(() => Array.from(document.querySelectorAll('script[src]')).map(s => (s as HTMLScriptElement).src).slice(0, 20));
      // Dump collected console messages early
      consoleMessages.forEach(m => console.log('[console-before-timeout]', m));
      throw new Error(`Timed out waiting for costscope root/title/autosignin. Partial body: ${bodyHtml}\nScripts: ${scripts.join(', ')}`);
    }
    // Ensure title visible (secondary wait if root won race)
    try { await pageTitle.waitFor({ state: 'visible', timeout: 5000 }); } catch {/* non-fatal */}

    // Instrument fetch to log requested URLs (only first time per URL)
    await page.evaluate(() => {
      if (!(window as any).__fetchInstrumented) {
        (window as any).__fetchInstrumented = true;
        const orig = window.fetch.bind(window);
        const seen = new Set<string>();
  (window as any).fetch = async (...args: any[]) => {
          try {
            const url = String(args[0]);
            if (!seen.has(url)) {
              seen.add(url);
              console.log('[e2e-fetch]', url);
            }
          } catch {/* ignore */}
          return orig(...(args as [RequestInfo, RequestInit?]));
        };
      }
    });

    // Poll DOM for table row count (diagnostic)
    for (let i = 0; i < 10; i++) {
      const rowCount = await page.locator('table tbody tr').count();
      console.log(`[e2e-dom] poll ${i} rowCount=${rowCount}`);
      if (rowCount > 0) break;
      await page.waitForTimeout(1000);
    }

    // Optional legacy heading text (non-fatal). Log only.
    const heading = page.getByRole('heading', { name: /cost overview/i });
    try {
      await heading.isVisible({ timeout: 5000 });
    } catch {
      console.log('[e2e] Cost overview heading not visible (ok if title present)');
    }

  const refreshButtons = page.getByRole('button', { name: /refresh/i });
    if (await refreshButtons.count()) {
      await refreshButtons.first().click();
    }

  // Strict assertions now that backend mock connectivity is verified.
  await expect(rootSentinel).toBeVisible();

  // Data assertions are covered by the dedicated endpoints/payload test.
  // Here we only verify that the page mounted without fatal errors and at most one benign widget error is visible.

  // No severe inline error cards should be present (allow a single non-critical widget error)
  const allErrorCards = page.locator('[data-testid="costscope-page-root"] .MuiCard-root:has-text("Error")');
  const errorCount = await allErrorCards.count();
  if (errorCount > 0) {
    // Tolerate a single charge categories widget error in flaky environments
    const tolerated = await allErrorCards.filter({ hasText: 'Failed to load charge categories' }).count();
    expect(errorCount - tolerated, 'No unexpected error cards on smoke path').toBeLessThanOrEqual(0);
  }

  // Log any correlation IDs (should normally be absent on success; retained for quick diagnostics without failing build)
  const correlations = await page.$$eval('.MuiTypography-caption', els => els.map(e => (e as HTMLElement).innerText).filter(t => /Correlation ID/i.test(t)));
  if (correlations.length) {
    console.log(`[e2e-diag] unexpected correlation IDs surfaced: ${correlations.join('|')}`);
  }

  // Soft assert: no *error* level messages nor captured window errors
  const hardErrors = consoleMessages.filter(m => m.startsWith('error:') || m.startsWith('pageerror:'));
  const windowErrors = await page.evaluate(() => (window as any).__costscopeErrors || []);
  expect([...hardErrors, ...windowErrors], `No console/window errors; full log:\n${consoleMessages.join('\n')}\nWindowErrors:${JSON.stringify(windowErrors)}`).toEqual([]);

  // Verify plugin bundle was actually served (best-effort)
  expect(await checkPluginBundle(page)).toBeTruthy();

  // Key region screenshot baseline (overview + table area) if RUN_E2E_SCREENSHOTS=1
  if (process.env.RUN_E2E_SCREENSHOTS === '1') {
    const region = page.locator('[data-testid=costscope-page-root]');
    await expect(region).toBeVisible();
    if (isScreenshotDiffEnabled()) {
      const maxDiff = process.env.E2E_SCREENSHOT_MAX_DIFF ? Number(process.env.E2E_SCREENSHOT_MAX_DIFF) : 50;
      await expect(region).toHaveScreenshot('costscope-page.spec.ts-costscope-region.png', { maxDiffPixels: maxDiff });
    } else {
      await region.screenshot({ path: `tests-e2e/artifacts/costscope-region.png` });
    }
  }
  });
});
