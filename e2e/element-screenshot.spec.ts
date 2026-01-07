/**
 * Element Screenshot Test
 *
 * Captures screenshots of specific UI elements with branch-aware naming.
 *
 * Usage:
 *   ELEMENT_SELECTOR="canvas" npm run screenshot:element
 *   ELEMENT_SELECTOR=".phase-display" npm run screenshot:element
 *   ELEMENT_SELECTOR=".tune-controls" SCREENSHOT_TAG="controls" npm run screenshot:element
 */
import { test } from '@playwright/test';
import { hideModals } from './helpers/dismiss-modals';
import { getScreenshotPath } from './helpers/get-screenshot-path';
import { injectLevaConfig, parseLevaConfigEnv } from './helpers/leva-config';
import { listBranchScreenshots, printScreenshotList } from './helpers/list-screenshots';
import { setupRenderListener } from './helpers/wait-for-render';

// Default element selectors for common UI components
const ELEMENT_PRESETS: Record<string, string> = {
  canvas: 'canvas',
  phase: '.phase-display, [data-testid="phase-display"]',
  controls: '.tune-controls, [data-testid="tune-controls"]',
  welcome: '[data-testid="welcome-modal"]',
  settings: '[data-testid="settings-modal"]',
};

test.describe('Element Screenshots', () => {
  test.setTimeout(120_000);

  test('capture element', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    // Get element selector from env or default to canvas
    let selector = process.env.ELEMENT_SELECTOR || 'canvas';

    // Check if it's a preset name
    if (ELEMENT_PRESETS[selector]) {
      selector = ELEMENT_PRESETS[selector];
    }

    // Generate output path with element tag
    const elementTag = process.env.SCREENSHOT_TAG || selector.replace(/[^a-z0-9]/gi, '-');
    const outputPath = getScreenshotPath(viewport, elementTag);
    const levaConfig = parseLevaConfigEnv();

    // Log screenshot parameters
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Element Screenshot Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Viewport:     ${viewport}`);
    console.log(`  Element:      ${selector}`);
    console.log(`  Tag:          ${elementTag}`);
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

    // Wait for canvas to be present (app is loaded)
    await page.waitForSelector('canvas', { timeout: 30_000 });

    // Hide modals if targeting canvas (but not if targeting a modal)
    const isModalSelector = selector.includes('modal') || selector.includes('settings');
    if (!isModalSelector) {
      await hideModals(page);
    }

    // Inject Leva config if provided
    if (levaConfig) {
      try {
        await injectLevaConfig(page, levaConfig);
        await page.waitForTimeout(500);
      } catch (error) {
        console.warn(`[${viewport}] Leva injection failed:`, error);
      }
    }

    // Wait for render
    await renderPromise;

    // Find the element
    const element = page.locator(selector).first();

    // Wait for element to be visible
    await element.waitFor({ state: 'visible', timeout: 10_000 });

    // Capture element screenshot
    await element.screenshot({ path: outputPath });
    console.log(`✓ Element screenshot saved successfully\n`);
  });

  // After all tests, show recent screenshots for the current branch
  test.afterAll(() => {
    const screenshots = listBranchScreenshots(10);
    printScreenshotList(screenshots);
  });
});
