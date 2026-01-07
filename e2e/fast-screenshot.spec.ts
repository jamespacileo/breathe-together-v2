/**
 * Fast Screenshot Test
 *
 * Captures scene screenshots with branch-aware naming, modal hiding,
 * and optional Leva config injection.
 *
 * Usage:
 *   npm run screenshot              # Desktop viewport
 *   npm run screenshot:all          # All viewports
 *   LEVA_CONFIG='{"bloomIntensity":1.2}' npm run screenshot
 *   SCREENSHOT_TAG="before" npm run screenshot
 */
import { test } from '@playwright/test';
import { hideModals } from './helpers/dismiss-modals';
import { getScreenshotPath } from './helpers/get-screenshot-path';
import { injectLevaConfig, parseLevaConfigEnv } from './helpers/leva-config';
import { listBranchScreenshots, printScreenshotList } from './helpers/list-screenshots';
import { setupRenderListener } from './helpers/wait-for-render';

test.describe('Fast Screenshots', () => {
  test.setTimeout(120_000);

  test('capture scene', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;
    const outputPath = getScreenshotPath(viewport);
    const tag = process.env.SCREENSHOT_TAG;
    const levaConfig = parseLevaConfigEnv();

    // Log screenshot parameters
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Screenshot Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Viewport:     ${viewport}`);
    console.log(`  Tag:          ${tag || '(none)'}`);
    console.log(`  Output:       ${outputPath}`);
    if (levaConfig) {
      console.log(
        `  Leva Config:  ${JSON.stringify(levaConfig, null, 2).replace(/\n/g, '\n                ')}`,
      );
    } else {
      console.log('  Leva Config:  (using code defaults)');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Set up render listener BEFORE navigation
    const renderPromise = setupRenderListener(page, viewport);

    // Navigate to app
    await page.goto('/');

    // Wait for canvas to be present
    await page.waitForSelector('canvas', { timeout: 30_000 });

    // Hide modals via CSS injection
    await hideModals(page);

    // Inject Leva config if provided
    if (levaConfig) {
      try {
        await injectLevaConfig(page, levaConfig);
        // Wait for config to take effect and re-render
        await page.waitForTimeout(500);
      } catch (error) {
        console.warn(`[${viewport}] Leva injection failed (dev mode may be disabled):`, error);
      }
    }

    // Wait for shards to render
    await renderPromise;

    // Capture screenshot
    await page.screenshot({ path: outputPath });
    console.log(`✓ Screenshot saved successfully\n`);
  });

  // After all tests, show recent screenshots for the current branch
  test.afterAll(() => {
    const screenshots = listBranchScreenshots(10);
    printScreenshotList(screenshots);
  });
});
