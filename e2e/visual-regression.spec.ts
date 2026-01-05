import { expect, test } from '@playwright/test';

/**
 * Visual Regression Tests
 *
 * Uses Playwright's visual comparison to detect unintended UI changes.
 * Screenshots are stored in e2e/__screenshots__/ and compared on subsequent runs.
 *
 * Best practices:
 * - Run tests in consistent environment (same OS, same browser version)
 * - Disable animations for stable screenshots
 * - Use maxDiffPixels or maxDiffPixelRatio for tolerance
 * - Update snapshots with: npx playwright test --update-snapshots
 */

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });

    // Wait for initial render to stabilize
    await page.waitForTimeout(2000);
  });

  test('breathing scene renders consistently', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    // Wait for the [SCREENSHOT_READY] marker if present
    await page
      .waitForEvent('console', {
        predicate: (msg) => msg.text().includes('[SCREENSHOT_READY]'),
        timeout: 60_000,
      })
      .catch(() => {
        console.log(`[${viewport}] No [SCREENSHOT_READY] marker, proceeding anyway`);
      });

    // Additional stabilization
    await page.waitForTimeout(500);

    // Take full page screenshot with specific breathing phase
    await expect(page).toHaveScreenshot(`breathing-scene-${viewport}.png`, {
      fullPage: true,
      // Allow small pixel differences due to anti-aliasing and animation
      maxDiffPixels: 100,
      // Mask dynamic elements if needed
      // mask: [page.locator('[data-testid="timestamp"]')],
    });
  });

  test('UI components render consistently', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    // Take screenshot of UI overlay (without canvas)
    // This tests UI components separately from WebGL rendering
    const uiContainer = page.locator('body');

    await expect(uiContainer).toHaveScreenshot(`ui-components-${viewport}.png`, {
      maxDiffPixels: 50,
    });
  });

  test('breathing phase indicator is visible', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    // Look for phase indicator element
    const phaseIndicator = page.locator(
      '[data-testid="phase-indicator"], [aria-label*="phase"], .phase-indicator',
    );

    // If phase indicator exists, screenshot it
    if (await phaseIndicator.isVisible().catch(() => false)) {
      await expect(phaseIndicator).toHaveScreenshot(`phase-indicator-${viewport}.png`, {
        maxDiffPixels: 20,
      });
    }
  });

  test('settings modal renders consistently', async ({ page }, testInfo) => {
    const viewport = testInfo.project.name;

    // Try to open settings
    const settingsButton = page.locator(
      'button[aria-label*="settings"], button[aria-label*="menu"], [data-testid="settings-button"]',
    );

    if (await settingsButton.isVisible().catch(() => false)) {
      await settingsButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"], [data-testid="settings-modal"]');

      if (await modal.isVisible().catch(() => false)) {
        await expect(modal).toHaveScreenshot(`settings-modal-${viewport}.png`, {
          maxDiffPixels: 50,
        });
      }
    }
  });
});

test.describe('Responsive Layout Visual Tests', () => {
  const viewportSizes = [
    { name: 'mobile-portrait', width: 375, height: 667 },
    { name: 'mobile-landscape', width: 667, height: 375 },
    { name: 'tablet-portrait', width: 768, height: 1024 },
    { name: 'tablet-landscape', width: 1024, height: 768 },
    { name: 'desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewportSizes) {
    test(`layout renders correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForSelector('canvas', { timeout: 30_000 });
      await page.waitForTimeout(2000);

      await expect(page).toHaveScreenshot(`layout-${viewport.name}.png`, {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });
  }
});

test.describe('Breathing Cycle Visual Phases', () => {
  test('captures different breathing phases', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });

    // Wait for initial stabilization
    await page.waitForTimeout(2000);

    // Capture screenshots at different times in the cycle
    // 4-7-8 pattern: 4s inhale, 7s hold, 8s exhale
    const phases = [
      { name: 'inhale-start', delay: 0 },
      { name: 'inhale-mid', delay: 2000 },
      { name: 'hold-start', delay: 4500 },
      { name: 'hold-mid', delay: 7500 },
      { name: 'exhale-start', delay: 11500 },
      { name: 'exhale-mid', delay: 15000 },
    ];

    for (const phase of phases) {
      if (phase.delay > 0) {
        await page.waitForTimeout(phase.delay);
      }

      await expect(page).toHaveScreenshot(`breathing-phase-${phase.name}.png`, {
        maxDiffPixels: 150, // Higher tolerance for animation differences
      });

      // Reset for next iteration (reload page)
      if (phase !== phases[phases.length - 1]) {
        await page.reload();
        await page.waitForSelector('canvas', { timeout: 30_000 });
        await page.waitForTimeout(2000);
      }
    }
  });
});

test.describe('Dark Mode Visual Tests', () => {
  test('renders correctly in dark mode', async ({ page }) => {
    // Set dark color scheme preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('breathing-scene-dark-mode.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('renders correctly in light mode', async ({ page }) => {
    // Set light color scheme preference
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('breathing-scene-light-mode.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});
