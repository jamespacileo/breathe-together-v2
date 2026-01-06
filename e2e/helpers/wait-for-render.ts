import type { Page } from '@playwright/test';

/**
 * Wait for the app to signal that shards are fully rendered
 * Listens for [SCREENSHOT_READY] console message
 */
export async function waitForRender(page: Page, viewport: string = 'desktop'): Promise<void> {
  // Desktop viewport (1920x1080) needs longer timeout for SwiftShader rendering
  const consoleTimeout = viewport === 'desktop' ? 90_000 : 60_000;

  // Set up console listener BEFORE navigation
  const screenshotReady = page.waitForEvent('console', {
    predicate: (msg) => msg.text().includes('[SCREENSHOT_READY]'),
    timeout: consoleTimeout,
  });

  // Wait for canvas to be present
  await page.waitForSelector('canvas', { timeout: 30_000 });

  // Wait for the app to signal shards are visible
  const msg = await screenshotReady;
  console.log(`[${viewport}] ${msg.text()}`);

  // Brief stabilization for render completion
  await page.waitForTimeout(500);
}

/**
 * Setup render listener before navigation (for use with page.goto)
 * Returns a promise that resolves when rendering is complete
 */
export function setupRenderListener(page: Page, viewport: string = 'desktop'): Promise<void> {
  const consoleTimeout = viewport === 'desktop' ? 90_000 : 60_000;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`[SCREENSHOT_READY] not received within ${consoleTimeout}ms`));
    }, consoleTimeout);

    page.on('console', (msg) => {
      if (msg.text().includes('[SCREENSHOT_READY]')) {
        clearTimeout(timeoutId);
        console.log(`[${viewport}] ${msg.text()}`);
        // Add stabilization delay
        setTimeout(resolve, 500);
      }
    });
  });
}
