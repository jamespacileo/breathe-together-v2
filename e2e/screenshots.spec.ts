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

    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });
    await page.waitForTimeout(3000); // Let Three.js stabilize

    await page.screenshot({ path: join(SCREENSHOTS_DIR, `${viewport}.png`) });
    console.log(`[${viewport}] ✓ captured`);
  });
});
