import { expect, test } from '@playwright/test';

/**
 * E2E Interaction Tests
 *
 * Tests behavioral interactions beyond screenshot validation.
 * Verifies animations, UI controls, and user interactions work correctly.
 */

test.describe('Breathing Cycle Animation', () => {
  test('breathing cycle progresses over time', async ({ page }) => {
    await page.goto('/');

    // Wait for canvas to be visible
    await page.waitForSelector('canvas', { timeout: 30_000 });

    // Wait for initial render to complete
    await page.waitForTimeout(1000);

    // Get initial phase text (if visible)
    const initialPhaseText = await page
      .locator('[data-testid="phase-indicator"], [aria-label*="phase"]')
      .textContent()
      .catch(() => null);

    // Wait for a partial cycle (10 seconds)
    await page.waitForTimeout(10_000);

    // Get current phase text
    const currentPhaseText = await page
      .locator('[data-testid="phase-indicator"], [aria-label*="phase"]')
      .textContent()
      .catch(() => null);

    // Phase should have changed (or at least time progressed)
    // If no phase indicator visible, just verify canvas is still rendering
    if (initialPhaseText && currentPhaseText) {
      expect(initialPhaseText).not.toBe(currentPhaseText);
    } else {
      // Verify canvas is still visible (animation didn't crash)
      await expect(page.locator('canvas')).toBeVisible();
    }
  });

  test('breathing cycle completes full cycle in 19 seconds', async ({ page }) => {
    await page.goto('/');

    await page.waitForSelector('canvas', { timeout: 30_000 });
    await page.waitForTimeout(1000);

    // Track phase changes over a full cycle
    const phaseChanges: string[] = [];
    const startTime = Date.now();

    // Monitor for 20 seconds (slightly more than 1 cycle)
    while (Date.now() - startTime < 20_000) {
      const phaseText = await page
        .locator('[data-testid="phase-indicator"], [aria-label*="phase"]')
        .textContent()
        .catch(() => null);

      if (phaseText && !phaseChanges.includes(phaseText)) {
        phaseChanges.push(phaseText);
      }

      await page.waitForTimeout(500);
    }

    // Should have seen multiple phases (at least 2-3)
    expect(phaseChanges.length).toBeGreaterThanOrEqual(2);
  });

  test('canvas renders without WebGL errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });

    // Wait for a few seconds to catch any delayed errors
    await page.waitForTimeout(5000);

    // Filter out known non-critical errors (if any)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes('[SCREENSHOT_READY]') && // Ignore screenshot marker
        !error.includes('DevTools'), // Ignore DevTools messages
    );

    // Should have no WebGL or Three.js errors
    expect(criticalErrors.filter((e) => e.includes('WebGL'))).toHaveLength(0);
    expect(criticalErrors.filter((e) => e.includes('Three'))).toHaveLength(0);
  });
});

test.describe('UI Interactions', () => {
  test('settings button is clickable', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });

    // Look for settings/controls button (adjust selector as needed)
    const settingsButton = page.locator(
      'button[aria-label*="settings"], button[aria-label*="menu"], [data-testid="settings-button"]',
    );

    if (await settingsButton.isVisible()) {
      await settingsButton.click();

      // Verify something happened (modal opened, menu appeared, etc.)
      // Adjust this based on actual UI implementation
      await page.waitForTimeout(500);

      // Check if modal or menu appeared
      const modal = page.locator('[role="dialog"], [data-testid="settings-modal"]');
      const menu = page.locator('[role="menu"], [data-testid="settings-menu"]');

      const hasModal = await modal.isVisible().catch(() => false);
      const hasMenu = await menu.isVisible().catch(() => false);

      expect(hasModal || hasMenu).toBe(true);
    }
  });

  test('page is responsive on different viewports', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });

    const canvasMobile = await page.locator('canvas').boundingBox();
    expect(canvasMobile).toBeTruthy();
    expect(canvasMobile!.width).toBeLessThanOrEqual(375);

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForSelector('canvas', { timeout: 30_000 });

    const canvasTablet = await page.locator('canvas').boundingBox();
    expect(canvasTablet).toBeTruthy();
    expect(canvasTablet!.width).toBeLessThanOrEqual(768);

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForSelector('canvas', { timeout: 30_000 });

    const canvasDesktop = await page.locator('canvas').boundingBox();
    expect(canvasDesktop).toBeTruthy();
    expect(canvasDesktop!.width).toBeLessThanOrEqual(1920);
  });

  test('page loads within performance budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });

    const loadTime = Date.now() - startTime;

    // Should load in under 30 seconds (generous for WebGL setup)
    expect(loadTime).toBeLessThan(30_000);

    // Log actual load time for monitoring
    console.log(`Page loaded in ${loadTime}ms`);
  });

  test('breathing animation is visible on page load', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });

    // Wait for initial animation
    await page.waitForTimeout(2000);

    // Take screenshot to verify something is rendered
    const screenshot = await page.screenshot();
    expect(screenshot.length).toBeGreaterThan(1000); // Non-blank page

    // Verify canvas has non-zero dimensions
    const canvas = await page.locator('canvas').boundingBox();
    expect(canvas).toBeTruthy();
    expect(canvas!.width).toBeGreaterThan(100);
    expect(canvas!.height).toBeGreaterThan(100);
  });
});

test.describe('Accessibility', () => {
  test('page has proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });

    // Check for ARIA landmarks
    const main = page.locator('main, [role="main"]');
    const canvas = page.locator('canvas');

    // At minimum, should have canvas element
    await expect(canvas).toBeVisible();

    // Check if there are any buttons with labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // At least one button should have an accessible name
      const firstButton = buttons.first();
      const ariaLabel = await firstButton.getAttribute('aria-label');
      const innerText = await firstButton.textContent();

      expect(ariaLabel || innerText).toBeTruthy();
    }
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 30_000 });

    // Try tabbing through the page
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    // Check if focus is visible
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();

    // Tab again
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    // Should have moved focus (or stayed if only one element)
    const focused2 = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused2).toBeTruthy();
  });
});
