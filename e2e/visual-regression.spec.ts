/**
 * Visual Regression Tests - Deterministic Rendering
 *
 * Uses ?visualTest=true mode to enable:
 * - Manual frame control via window.advanceFrame()
 * - Stable screenshots (no animation variance)
 * - Reliable pixel sampling (preserveDrawingBuffer enabled)
 *
 * These tests complement the scene-graph tests in colorValidation.test.tsx
 * by testing the actual rendered output.
 */
import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { hideModals } from './helpers/dismiss-modals';

// ============================================
// Probe Points for color sampling
// ============================================

interface ProbePoint {
  name: string;
  x: number; // 0-1 percentage from left
  y: number; // 0-1 percentage from top
  expected: {
    minBrightness?: number;
    maxBrightness?: number;
    description: string;
  };
}

const PROBE_POINTS: ProbePoint[] = [
  {
    name: 'center-globe',
    x: 0.5,
    y: 0.5,
    expected: {
      minBrightness: 80,
      maxBrightness: 250,
      description: 'Globe center - should show earth/sphere tones',
    },
  },
  {
    name: 'top-background',
    x: 0.5,
    y: 0.1,
    expected: {
      minBrightness: 150,
      maxBrightness: 255,
      description: 'Top sky - light cream/pastel gradient',
    },
  },
  {
    name: 'bottom-background',
    x: 0.5,
    y: 0.9,
    expected: {
      minBrightness: 80,
      maxBrightness: 240,
      description: 'Bottom area - clouds or gradient',
    },
  },
];

// ============================================
// Helpers
// ============================================

interface RGB {
  r: number;
  g: number;
  b: number;
}

async function sampleCanvasPixel(page: Page, x: number, y: number): Promise<RGB | null> {
  return page.evaluate(
    ({ px, py }: { px: number; py: number }) => {
      const canvas = document.querySelector('#root canvas') as HTMLCanvasElement;
      if (!canvas) return null;

      // With preserveDrawingBuffer=true, we can read directly via 2D context
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(canvas, 0, 0);
      const imageData = ctx.getImageData(px, py, 1, 1);
      return {
        r: imageData.data[0],
        g: imageData.data[1],
        b: imageData.data[2],
      };
    },
    { px: Math.floor(x), py: Math.floor(y) },
  );
}

function getBrightness(rgb: RGB): number {
  return (rgb.r + rgb.g + rgb.b) / 3;
}

// ============================================
// Tests
// ============================================

test.describe('Visual Regression (Deterministic)', () => {
  test.setTimeout(120_000);

  test.describe('Scene Stability', () => {
    test('main canvas has expected dimensions', async ({ page }) => {
      await page.goto('/?visualTest=true');
      await page.waitForSelector('#root canvas', { timeout: 30_000 });
      await hideModals(page);

      const canvas = page.locator('#root canvas').first();
      const box = await canvas.boundingBox();

      expect(box).not.toBeNull();
      expect(box?.width).toBeGreaterThan(100);
      expect(box?.height).toBeGreaterThan(100);
    });

    test('visual test controller is ready', async ({ page }) => {
      await page.goto('/?visualTest=true');
      await page.waitForSelector('#root canvas', { timeout: 30_000 });

      // Wait for controller to initialize
      await page.waitForFunction(() => window.visualTestReady === true, {
        timeout: 10_000,
      });

      const ready = await page.evaluate(() => window.visualTestReady);
      expect(ready).toBe(true);
    });

    test('can advance frames manually', async ({ page }) => {
      await page.goto('/?visualTest=true');
      await page.waitForSelector('#root canvas', { timeout: 30_000 });
      await page.waitForFunction(() => window.advanceFrame !== undefined);

      // Advance by 2 seconds
      await page.evaluate(() => window.advanceFrame?.(2.0));

      const time = await page.evaluate(() => window.visualTestTime);
      expect(time).toBeCloseTo(2.0, 1);
    });
  });

  test.describe('Pixel Sampling', () => {
    // Skip: drawImage from WebGL canvas returns black in headless Chrome/SwiftShader
    // This is a known browser limitation, not a code issue
    // Reference: https://bugs.chromium.org/p/chromium/issues/detail?id=769354
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Test function requires multiple brightness checks per probe point
    test.skip('probe points return valid colors', async ({ page }, testInfo: TestInfo) => {
      const viewport = testInfo.project.name;

      await page.goto('/?visualTest=true');
      await page.waitForSelector('#root canvas', { timeout: 30_000 });
      await hideModals(page);
      await page.waitForFunction(() => window.advanceFrame !== undefined);

      // Advance scene to allow initial rendering
      await page.evaluate(() => window.advanceFrame?.(2.0));

      const width = page.viewportSize()?.width || 1920;
      const height = page.viewportSize()?.height || 1080;

      const results: Array<{
        name: string;
        passed: boolean;
        color: RGB | null;
        brightness: number;
        message: string;
      }> = [];

      for (const probe of PROBE_POINTS) {
        const x = probe.x * width;
        const y = probe.y * height;
        const color = await sampleCanvasPixel(page, x, y);

        if (!color) {
          results.push({
            name: probe.name,
            passed: false,
            color: null,
            brightness: 0,
            message: 'Failed to sample pixel',
          });
          continue;
        }

        const brightness = getBrightness(color);
        let passed = true;
        let message = 'OK';

        if (
          probe.expected.minBrightness !== undefined &&
          brightness < probe.expected.minBrightness
        ) {
          passed = false;
          message = `Too dark (${brightness.toFixed(0)} < ${probe.expected.minBrightness})`;
        }
        if (
          probe.expected.maxBrightness !== undefined &&
          brightness > probe.expected.maxBrightness
        ) {
          passed = false;
          message = `Too bright (${brightness.toFixed(0)} > ${probe.expected.maxBrightness})`;
        }

        results.push({ name: probe.name, passed, color, brightness, message });
      }

      // Log results
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Probe Point Results (${viewport})`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      for (const r of results) {
        const status = r.passed ? '✓' : '✗';
        const rgb = r.color ? `RGB(${r.color.r}, ${r.color.g}, ${r.color.b})` : 'N/A';
        console.log(`  ${status} ${r.name}: ${rgb} - ${r.message}`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const failures = results.filter((r) => !r.passed);
      expect(failures.length).toBe(0);
    });
  });

  test.describe('Visual Snapshots', () => {
    test('full scene matches baseline', async ({ page }, testInfo: TestInfo) => {
      const viewport = testInfo.project.name;

      await page.goto('/?visualTest=true');
      await page.waitForSelector('#root canvas', { timeout: 30_000 });
      await hideModals(page);
      await page.waitForFunction(() => window.advanceFrame !== undefined);

      // Advance to a stable point (2 seconds of animation)
      await page.evaluate(() => window.advanceFrame?.(2.0));

      // Take screenshot - should now be deterministic
      await expect(page).toHaveScreenshot(`scene-deterministic-${viewport}.png`, {
        maxDiffPixelRatio: 0.02,
        threshold: 0.1,
      });
    });

    // Skip: Canvas element screenshot has stability issues with WebGL animation
    test.skip('canvas element matches baseline', async ({ page }, testInfo: TestInfo) => {
      const viewport = testInfo.project.name;

      await page.goto('/?visualTest=true');
      await page.waitForSelector('#root canvas', { timeout: 30_000 });
      await hideModals(page);
      await page.waitForFunction(() => window.advanceFrame !== undefined);

      await page.evaluate(() => window.advanceFrame?.(2.0));

      const canvas = page.locator('#root canvas').first();
      await expect(canvas).toHaveScreenshot(`canvas-deterministic-${viewport}.png`, {
        maxDiffPixelRatio: 0.02,
        threshold: 0.1,
      });
    });
  });
});
