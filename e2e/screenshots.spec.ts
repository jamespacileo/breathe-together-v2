import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';

const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || './screenshots';

if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Preview Screenshots', () => {
  test.setTimeout(120_000);

  test('capture preview', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    // Desktop viewport (1920x1080) needs longer timeout for SwiftShader rendering
    const consoleTimeout = viewport === 'desktop' ? 90_000 : 60_000;

    // Set up console listener BEFORE navigation
    const screenshotReady = page.waitForEvent('console', {
      predicate: (msg) => msg.text().includes('[SCREENSHOT_READY]'),
      timeout: consoleTimeout,
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
