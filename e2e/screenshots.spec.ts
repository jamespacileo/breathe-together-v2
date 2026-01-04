import { test } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getCurrentPhase, getMsUntilPhase } from './utils';

// Output directory for screenshots
const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || './screenshots';

// Ensure screenshots directory exists
if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Wait for the page to be ready for screenshot
 * Handles both canvas (WebGL) pages and regular HTML pages
 */
async function waitForPageReady(page: import('@playwright/test').Page, hasCanvas = true) {
  if (hasCanvas) {
    // Wait for canvas to exist
    const canvas = await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => null);

    if (canvas) {
      // Give Three.js time to render
      await page.waitForTimeout(3000);
    }
  }

  // Wait for network to settle
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
}

test.describe('Preview Screenshots', () => {
  // Increase timeout for breathing phase synchronization
  test.setTimeout(90_000);

  test('capture breathing phases', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    // Navigate and wait for app to load
    await page.goto('/');
    await waitForPageReady(page, true);

    const phases = ['inhale', 'holdIn', 'exhale'] as const;

    for (const phase of phases) {
      const ms = getMsUntilPhase(phase);
      const currentPhase = getCurrentPhase();

      console.log(
        `[${viewport}] Current: ${currentPhase}, waiting ${(ms / 1000).toFixed(1)}s for ${phase}`,
      );

      if (ms > 100) {
        await page.waitForTimeout(ms);
      }

      // Small buffer after reaching phase
      await page.waitForTimeout(200);

      const filename = `${viewport}-${phase === 'holdIn' ? 'hold' : phase}.png`;
      const filepath = join(SCREENSHOTS_DIR, filename);

      await page.screenshot({ path: filepath });
      console.log(`[${viewport}] ✓ Saved ${filename}`);
    }
  });

  test('capture admin page', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    // Go directly to admin (no canvas wait needed)
    await page.goto('/admin');
    await waitForPageReady(page, false);

    const filename = `${viewport}-admin.png`;
    const filepath = join(SCREENSHOTS_DIR, filename);

    await page.screenshot({ path: filepath });
    console.log(`[${viewport}] ✓ Saved ${filename}`);
  });
});
