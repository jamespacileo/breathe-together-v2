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
  // 45s timeout: ~15s page load + ~19s full cycle + buffer
  test.setTimeout(45_000);

  test('capture breathing phases', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    await page.goto('/');
    await waitForPageReady(page, true);

    // Capture phases in optimal order (starting from current phase)
    const phases = getPhasesInOptimalOrder();
    console.log(`[${viewport}] Optimal phase order: ${phases.join(' → ')}`);

    for (const phase of phases) {
      const alreadyInPhase = isInPhase(phase);
      const ms = getMsUntilPhase(phase);

      if (alreadyInPhase) {
        console.log(`[${viewport}] Already in ${phase}`);
      } else if (ms > 0) {
        console.log(`[${viewport}] Waiting ${(ms / 1000).toFixed(1)}s for ${phase}`);
        await page.waitForTimeout(ms);
      }

      const filename = `${viewport}-${phase === 'holdIn' ? 'hold' : phase}.png`;
      await page.screenshot({ path: join(SCREENSHOTS_DIR, filename) });
      console.log(`[${viewport}] ✓ ${filename}`);
    }
  });

  test('capture admin page', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    await page.goto('/admin');
    await waitForPageReady(page, false);

    const filename = `${viewport}-admin.png`;
    await page.screenshot({ path: join(SCREENSHOTS_DIR, filename) });
    console.log(`[${viewport}] ✓ ${filename}`);
  });
});
