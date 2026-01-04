import { test } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || './screenshots';

if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Preview Screenshots', () => {
  test.setTimeout(90_000);

  test('capture preview', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    // Set up console listener BEFORE navigation
    const screenshotReady = page.waitForEvent('console', {
      predicate: (msg) => msg.text().includes('[SCREENSHOT_READY]'),
      timeout: 60_000,
    });

    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });

    // Wait for the app to signal shards are visible
    const msg = await screenshotReady;
    console.log(`[${viewport}] ${msg.text()}`);

    // Brief stabilization for render completion
    await page.waitForTimeout(500);

    await page.screenshot({ path: join(SCREENSHOTS_DIR, `${viewport}.png`) });
    console.log(`[${viewport}] ✓ captured`);
  });
});
