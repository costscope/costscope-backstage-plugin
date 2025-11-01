/* Shared E2E helpers */
export async function fetchJson(url: string, expectStatus = 200, retries = 8, delayMs = 250): Promise<any> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status === expectStatus) {
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error(`Unexpected content-type ${ct}`);
        return await res.json();
      }
      lastErr = new Error(`Status ${res.status} (want ${expectStatus})`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw lastErr;
}

export async function waitForPredicate(fn: () => Promise<boolean> | boolean, timeoutMs = 10_000, intervalMs = 200) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * Attempt to navigate to a Backstage route handling potential sign-in / guest flows.
 * Idempotent: safe to call even if already authenticated.
 */
export async function navigateWithAuth(page: import('@playwright/test').Page, targetPath: string) {
  // Start at root first to allow auth redirect logic to run.
  await page.goto('/');
  await page.waitForTimeout(200);
  await page.goto(targetPath);
  const enterBtn = page.getByRole('button', { name: /(sign in|enter)/i });
  try {
    if (await enterBtn.first().isVisible({ timeout: 3000 })) {
      await enterBtn.first().click();
      await page.waitForTimeout(300);
    }
  } catch {}
  const guestButton = page.getByRole('button', { name: /guest|enter as guest/i });
  try {
    if (await guestButton.first().isVisible({ timeout: 3000 })) {
      await guestButton.first().click();
      await page.waitForTimeout(300);
    }
  } catch {}
  if (!page.url().includes(targetPath)) {
    await page.goto(targetPath);
  }
}

/** Quick sanity that the plugin bundle (dynamic module) is reachable. */
export async function checkPluginBundle(page: import('@playwright/test').Page) {
  try {
  // Try new package name module first, then legacy for backward compatibility
  let resp = await page.request.get('/module-costscope-backstage-plugin.js');
  if (resp.ok()) return true;
  resp = await page.request.get('/module-costscope-plugin.js');
  if (resp.ok()) return true;
  } catch {
    return false;
  }
}

/** Whether screenshot diffing is enabled via env. */
export function isScreenshotDiffEnabled() {
  return process.env.E2E_SCREENSHOT_DIFF === '1';
}
