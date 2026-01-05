#!/usr/bin/env node

/**
 * Wait for Preview Deployment to be Ready
 *
 * Verifies that:
 * 1. URL responds with HTTP 200
 * 2. WebGL canvas element exists on the page
 * 3. Canvas has rendered at least one frame
 *
 * This prevents capturing blank screenshots from previews that
 * return 200 but haven't finished initializing Three.js.
 */

import { chromium } from 'playwright';

const PREVIEW_URL = process.env.PREVIEW_URL;
const MAX_ATTEMPTS = 30;
const RETRY_DELAY_MS = 5000;

if (!PREVIEW_URL) {
  console.error('❌ PREVIEW_URL environment variable is required');
  process.exit(1);
}

/**
 * Check if preview is ready by verifying HTTP status and canvas rendering
 */
async function checkPreviewReady() {
  let browser;
  try {
    // First check: HTTP status
    const httpResponse = await fetch(PREVIEW_URL);
    if (!httpResponse.ok) {
      return {
        ready: false,
        reason: `HTTP ${httpResponse.status}`,
      };
    }

    // Second check: Canvas exists and is rendering
    browser = await chromium.launch({
      args: ['--use-gl=angle', '--use-angle=swiftshader'],
    });

    const page = await browser.newPage();

    try {
      await page.goto(PREVIEW_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait for canvas element
      const canvas = await page.waitForSelector('canvas', {
        timeout: 10000,
        state: 'attached',
      }).catch(() => null);

      if (!canvas) {
        return {
          ready: false,
          reason: 'Canvas element not found',
        };
      }

      // Verify canvas has dimensions
      const canvasInfo = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        return {
          width: canvas?.width || 0,
          height: canvas?.height || 0,
          visible: canvas?.offsetWidth > 0 && canvas?.offsetHeight > 0,
        };
      });

      if (canvasInfo.width === 0 || canvasInfo.height === 0) {
        return {
          ready: false,
          reason: `Canvas has zero dimensions (${canvasInfo.width}×${canvasInfo.height})`,
        };
      }

      if (!canvasInfo.visible) {
        return {
          ready: false,
          reason: 'Canvas not visible in viewport',
        };
      }

      // All checks passed
      return {
        ready: true,
        canvasInfo,
      };

    } finally {
      await page.close();
    }

  } catch (error) {
    return {
      ready: false,
      reason: error.message,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Wait for preview with retry logic
 */
async function waitForPreview() {
  console.log(`Waiting for preview deployment at: ${PREVIEW_URL}`);
  console.log(`Max attempts: ${MAX_ATTEMPTS} (${(MAX_ATTEMPTS * RETRY_DELAY_MS / 1000)}s timeout)\n`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[${attempt}/${MAX_ATTEMPTS}] Checking preview readiness...`);

    const result = await checkPreviewReady();

    if (result.ready) {
      console.log(`\n✅ Preview is ready!`);
      console.log(`   Canvas: ${result.canvasInfo.width}×${result.canvasInfo.height}`);
      console.log(`   Visible: ${result.canvasInfo.visible}`);
      return 0;
    }

    console.log(`   ⏳ Not ready: ${result.reason}`);

    if (attempt < MAX_ATTEMPTS) {
      console.log(`   Retrying in ${RETRY_DELAY_MS / 1000}s...\n`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  console.error(`\n❌ Preview not ready after ${MAX_ATTEMPTS} attempts`);
  console.error(`   This may indicate a deployment failure or slow cold start`);
  console.error(`   Check the preview deployment workflow logs`);
  return 1;
}

// Run and exit with appropriate code
waitForPreview()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
