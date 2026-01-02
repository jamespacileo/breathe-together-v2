import { chromium } from 'playwright';
import { mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const PREVIEW_URL = process.env.PREVIEW_URL;
const SCREENSHOTS_DIR = './screenshots';

// Validate required environment variable
if (!PREVIEW_URL) {
  console.error('❌ Error: PREVIEW_URL environment variable is required');
  console.error('   Usage: PREVIEW_URL=https://example.com node screenshot.mjs');
  process.exit(1);
}

// =============================================================================
// Breathing Cycle Configuration (imported from shared config)
// =============================================================================

// Load breathing configuration from shared source of truth
const breathConfig = JSON.parse(
  await readFile(new URL('../../breath-config.json', import.meta.url), 'utf-8')
);

const BREATH_PHASES = {
  INHALE: breathConfig.breathPhases.inhale,
  HOLD_IN: breathConfig.breathPhases.holdIn,
  EXHALE: breathConfig.breathPhases.exhale,
  HOLD_OUT: breathConfig.breathPhases.holdOut,
};

const TOTAL_CYCLE = BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN +
                    BREATH_PHASES.EXHALE + BREATH_PHASES.HOLD_OUT;

// Phase timing boundaries (seconds into cycle)
const PHASE_BOUNDARIES = {
  inhale: { start: 0, end: BREATH_PHASES.INHALE },
  holdIn: { start: BREATH_PHASES.INHALE, end: BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN },
  exhale: { start: BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN, end: TOTAL_CYCLE },
};

// =============================================================================
// Screens to Capture
// =============================================================================

// Breathing-synchronized screens (require phase timing)
const BREATHING_SCREENS = [
  {
    name: 'inhale',
    path: '/',
    waitForPhase: 'inhale',
    description: 'Breathing app - Inhale phase (particles contracting)'
  },
  {
    name: 'hold',
    path: '/',
    waitForPhase: 'holdIn',
    description: 'Breathing app - Hold phase (particles at rest, close)'
  },
  {
    name: 'exhale',
    path: '/',
    waitForPhase: 'exhale',
    description: 'Breathing app - Exhale phase (particles expanding)'
  },
];

// Static screens (no phase synchronization needed)
const STATIC_SCREENS = [
  {
    name: 'admin',
    path: '/admin',
    waitForPhase: null,
    description: 'Admin panel'
  },
];

// Viewport configurations
const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

// =============================================================================
// Phase Timing Utilities
// =============================================================================

/**
 * Get current position in breathing cycle (0 to TOTAL_CYCLE seconds)
 */
function getCyclePosition() {
  const nowSeconds = Date.now() / 1000;
  return nowSeconds % TOTAL_CYCLE;
}

/**
 * Calculate milliseconds until mid-point of target phase
 * @param {string} targetPhase - 'inhale', 'holdIn', or 'exhale'
 * @returns {number} Milliseconds to wait (0 if already at phase)
 */
function getMsUntilPhaseMidpoint(targetPhase) {
  const boundaries = PHASE_BOUNDARIES[targetPhase];
  if (!boundaries) return 0;

  const phaseMidpoint = (boundaries.start + boundaries.end) / 2;
  const currentPos = getCyclePosition();

  let secondsUntil = phaseMidpoint - currentPos;
  if (secondsUntil < 0) {
    // Phase already passed in this cycle, wait for next cycle
    secondsUntil += TOTAL_CYCLE;
  }

  // Only capture immediately if we're very close (within 0.1s)
  // This prevents capturing at wrong phase due to timing drift
  if (secondsUntil < 0.1) {
    return 0;
  }

  return Math.ceil(secondsUntil * 1000);
}

/**
 * Get current phase name for logging
 * @returns {string} Current phase name
 */
function getCurrentPhaseName() {
  const pos = getCyclePosition();
  if (pos < PHASE_BOUNDARIES.inhale.end) return 'inhale';
  if (pos < PHASE_BOUNDARIES.holdIn.end) return 'holdIn';
  return 'exhale';
}

// =============================================================================
// Page Ready Verification
// =============================================================================

/**
 * Wait for page to be ready, with WebGL verification for canvas pages
 * @param {import('playwright').Page} page - Playwright page instance
 * @param {boolean} isCanvas - Whether this is a WebGL canvas page
 */
async function waitForPageReady(page, isCanvas = true) {
  if (isCanvas) {
    // Wait for WebGL canvas to exist
    await page.waitForSelector('canvas', { timeout: 30000 });

    // Verify canvas is actually rendering (not blank)
    const isRendering = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;

      // Check if canvas has non-zero dimensions
      if (canvas.width === 0 || canvas.height === 0) return false;

      // Try WebGL first (for Three.js apps)
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      if (gl) {
        try {
          // Sample center pixel using WebGL readPixels
          const x = Math.floor(canvas.width / 2);
          const y = Math.floor(canvas.height / 2);
          const pixel = new Uint8Array(4);
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

          // Check if any channel has data (not fully black/transparent)
          return pixel.some(val => val !== 0);
        } catch (e) {
          // readPixels may fail during initialization, assume rendering
          return true;
        }
      }

      // Fallback to 2D canvas verification
      const ctx = canvas.getContext('2d');
      if (!ctx) return false; // No valid context

      try {
        const imageData = ctx.getImageData(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1,
          1
        );

        // Check if pixel has any color data
        return imageData.data.some(val => val !== 0);
      } catch (e) {
        // getImageData may fail, assume rendering
        return true;
      }
    });

    if (!isRendering) {
      console.log('   ⚠️  Canvas exists but may not be rendering yet, waiting...');
      await page.waitForTimeout(2000);
    }

    // Additional wait for Three.js initialization
    await page.waitForTimeout(3000);
  } else {
    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }
}

// =============================================================================
// Screenshot Capture
// =============================================================================

/**
 * Capture screenshots for all viewports and screens
 */
async function captureScreenshots() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    await mkdir(SCREENSHOTS_DIR, { recursive: true });
  }

  let browser;
  try {
    browser = await chromium.launch({
      args: ['--use-gl=angle', '--use-angle=swiftshader'],
    });

    console.log(`Capturing screenshots from: ${PREVIEW_URL}`);
    console.log(`Breathing cycle: ${TOTAL_CYCLE}s (Inhale: ${BREATH_PHASES.INHALE}s, Hold: ${BREATH_PHASES.HOLD_IN}s, Exhale: ${BREATH_PHASES.EXHALE}s)\n`);

    const allScreens = [...BREATHING_SCREENS, ...STATIC_SCREENS];

    for (const viewport of VIEWPORTS) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📱 ${viewport.name.toUpperCase()} (${viewport.width}×${viewport.height})`);
      console.log('='.repeat(60));

      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });

      for (const screen of allScreens) {
        const page = await context.newPage();
        const filename = `${viewport.name}-${screen.name}.png`;
        const isCanvasPage = screen.path === '/';

        try {
          console.log(`\n📸 ${screen.description}`);

          // Navigate to the screen
          const url = `${PREVIEW_URL}${screen.path}`;
          console.log(`   Loading: ${url}`);

          await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: 60000,
          });

          // Wait for page to be ready
          await waitForPageReady(page, isCanvasPage);

          // If this screen needs a specific breathing phase, wait for it
          if (screen.waitForPhase) {
            const msUntil = getMsUntilPhaseMidpoint(screen.waitForPhase);
            if (msUntil > 0) {
              console.log(`   Current phase: ${getCurrentPhaseName()}`);
              console.log(`   Waiting ${(msUntil/1000).toFixed(1)}s for ${screen.waitForPhase} phase...`);
              await page.waitForTimeout(msUntil);
            }
            console.log(`   Now at: ${getCurrentPhaseName()} phase ✓`);
          }

          // Capture screenshot
          await page.screenshot({
            path: `${SCREENSHOTS_DIR}/${filename}`,
            fullPage: false,
          });
          console.log(`   ✅ Saved: ${filename}`);

        } catch (error) {
          console.error(`   ❌ Error capturing ${filename}: ${error.message}`);
          // Don't save error screenshots - they create noise
          throw error; // Propagate error to fail the workflow
        } finally {
          await page.close();
        }
      }

      await context.close();
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✨ Screenshot capture complete!');
    console.log('='.repeat(60));

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

captureScreenshots().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
