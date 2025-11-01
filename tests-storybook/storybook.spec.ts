import { test, expect } from '@playwright/test';

const SB_BASE = process.env.STORYBOOK_URL || 'http://localhost:6006';

async function fetchIndex() {
  const url = `${SB_BASE}/index.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch Storybook index.json: ${res.status}`);
  return res.json() as Promise<any>;
}

// Utility: detect error overlays or runtime errors in the story frame
async function assertNoErrorOverlay(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message || String(e)));

  // Prefer a deterministic readiness signal over networkidle (storybook keeps websockets open)
  await page.waitForSelector('body', { state: 'visible' });
  // Docs top-level container or preview root inside iframe
  await page.waitForTimeout(200); // allow layout

  const badTexts = [
    'The component failed to render properly',
    'Something went wrong while rendering cost data',
    'typeerror',
    'is not a function',
    'referenceerror',
  ];
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  for (const t of badTexts) {
    expect.soft(bodyText).not.toContain(t.toLowerCase());
  }
  expect(errors, errors.join('\n')).toHaveLength(0);
}

// Generate one test per story id from index.json. We go through the manager URL (?path=/story/<id>)
// which covers both Canvas stories and Docs-only entries (they have --docs suffix).

test.describe('Storybook stories render without error', () => {
  test('index.json is reachable', async ({ request }) => {
    const res = await request.get(`${SB_BASE}/index.json`);
    expect(res.ok()).toBeTruthy();
  });

  test('visit each story id', async ({ page }) => {
    const index = await fetchIndex();
    let stories: string[] = Object.keys(index.entries || {});
    // Skip stories that intentionally render error states (they would trip our error overlay assertions)
    const skipPatterns = [/--error$/, /--error-state$/, /--errorstate$/, /error\b/i];
    stories = stories.filter((id) => !skipPatterns.some((rx) => rx.test(id)));
    expect(stories.length).toBeGreaterThan(0);

    // Keep it bounded locally; in CI we can run all
    const maxLocal = process.env.SB_MAX_STORIES ? Number(process.env.SB_MAX_STORIES) : 1000;
    let visited = 0;

    for (const id of stories) {
      if (visited >= maxLocal) break;
      const url = `${SB_BASE}/?path=/story/${id}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      // Prefer the preview iframe if present; else check top-level (Docs-only)
      const iframe = page.locator('#storybook-preview-iframe');
      if (
        await iframe
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        const frame = await (await iframe.elementHandle())!.contentFrame();
        if (frame) await assertNoErrorOverlay(frame as any);
        else await assertNoErrorOverlay(page);
      } else {
        await assertNoErrorOverlay(page);
      }
      visited += 1;
    }
  });
});
