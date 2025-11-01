import { test, expect } from '@playwright/test';

const SB_BASE = process.env.STORYBOOK_URL || 'http://localhost:6006';

async function fetchIndex() {
  const res = await fetch(`${SB_BASE}/index.json`);
  if (!res.ok) throw new Error(`Failed to fetch Storybook index.json: ${res.status}`);
  return (await res.json()) as any;
}

async function assertNoErrorOverlay(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message || String(e)));
  await page.waitForSelector('body', { state: 'visible' });
  await page.waitForTimeout(200);
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  const badTexts = [
    'something went wrong while rendering cost data',
    'is not a function',
    'typeerror',
    'referenceerror',
  ];
  for (const t of badTexts) {
    expect.soft(bodyText).not.toContain(t.toLowerCase());
  }
  expect(errors, errors.join('\n')).toHaveLength(0);
}

// Tests focused on the "Pages" group to ensure top-level pages render in both Canvas and Docs

test.describe('Costscope Pages render', () => {
  test('Canvas: each Pages story renders without error', async ({ page }) => {
    const index = await fetchIndex();
    const entries = index.entries || {};
    const pageStories: string[] = Object.values(entries)
      .filter(
        (e: any) =>
          e.type === 'story' && typeof e.title === 'string' && e.title.includes('/Pages/'),
      )
      .map((e: any) => e.id);

    expect(pageStories.length).toBeGreaterThan(0);

    for (const id of pageStories) {
      await page.goto(`${SB_BASE}/?path=/story/${id}`, { waitUntil: 'domcontentloaded' });
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
    }
  });

  test('Docs: each Pages docs entry renders without error', async ({ page }) => {
    const index = await fetchIndex();
    const entries = index.entries || {};
    const pageDocs: string[] = Object.values(entries)
      .filter(
        (e: any) => e.type === 'docs' && typeof e.title === 'string' && e.title.includes('/Pages/'),
      )
      .map((e: any) => e.id);

    expect(pageDocs.length).toBeGreaterThan(0);

    for (const id of pageDocs) {
      await page.goto(`${SB_BASE}/?path=/docs/${id}`, { waitUntil: 'domcontentloaded' });
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
    }
  });
});
