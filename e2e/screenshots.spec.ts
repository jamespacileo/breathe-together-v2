import { test } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getCurrentPhase, getMsUntilPhase, isInPhase } from './utils';

// Output directory for screenshots
const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || './screenshots';

// Ensure screenshots directory exists
if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Wait for the page to be ready for screenshot
 */
async function waitForPageReady(page: import('@playwright/test').Page, hasCanvas = true) {
  if (hasCanvas) {
    const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
    if (canvas) {
      await page.waitForTimeout(1500);
    }
  }
  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * Get phases in optimal capture order starting from current position.
 * This minimizes total wait time by capturing current phase first,
 * then proceeding in cycle order.
 */
function getPhasesInOptimalOrder(): Array<'inhale' | 'holdIn' | 'exhale'> {
  const allPhases: Array<'inhale' | 'holdIn' | 'exhale'> = ['inhale', 'holdIn', 'exhale'];
  const current = getCurrentPhase() as 'inhale' | 'holdIn' | 'exhale';
  const currentIndex = allPhases.indexOf(current);

  // Rotate array to start from current phase
  return [...allPhases.slice(currentIndex), ...allPhases.slice(0, currentIndex)];
}

test.describe('Preview Screenshots', () => {
  // 120s timeout: CI page loads are 40-50s + 19s breathing cycle + admin navigation
  test.setTimeout(120_000);

  /**
   * Single test per viewport - captures ALL screenshots (breathing phases + admin)
   * This avoids multiple expensive page loads per viewport in CI
   */
  test('capture all screenshots', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    // 1. Load main page and capture all breathing phases
    await page.goto('/');
    await waitForPageReady(page, true);

    const phases = getPhasesInOptimalOrder();
    console.log(`[${viewport}] Phase order: ${phases.join(' → ')}`);

    for (const phase of phases) {
      const alreadyInPhase = isInPhase(phase);
      const ms = getMsUntilPhase(phase);

      if (alreadyInPhase) {
        console.log(`[${viewport}] In ${phase}`);
      } else if (ms > 0) {
        console.log(`[${viewport}] Wait ${(ms / 1000).toFixed(1)}s → ${phase}`);
        await page.waitForTimeout(ms);
      }

      const filename = `${viewport}-${phase === 'holdIn' ? 'hold' : phase}.png`;
      await page.screenshot({ path: join(SCREENSHOTS_DIR, filename) });
      console.log(`[${viewport}] ✓ ${filename}`);
    }

    // 2. Navigate to admin and capture (much faster - no WebGL)
    await page.goto('/admin');
    await waitForPageReady(page, false);

    const adminFilename = `${viewport}-admin.png`;
    await page.screenshot({ path: join(SCREENSHOTS_DIR, adminFilename) });
    console.log(`[${viewport}] ✓ ${adminFilename}`);
  });
});
