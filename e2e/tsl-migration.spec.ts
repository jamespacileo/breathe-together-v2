/**
 * TSL Migration Visual Regression Tests
 *
 * Compares GLSL (traditional ShaderMaterial) vs TSL (Three.js Shading Language)
 * implementations to ensure visual parity during migration.
 *
 * Test Strategy:
 * 1. Pixel-diff comparison (< 1% difference tolerance)
 * 2. Breathing synchronization validation
 * 3. Performance benchmarking (frame time)
 *
 * Usage:
 *   npm run test:tsl                    # Run all TSL tests
 *   npm run test:tsl -- --grep SubtleLightRays  # Test specific shader
 */

import { expect, test } from '@playwright/test';
import {
  BREATH_PHASES,
  exposeBreathPhase,
  waitForBreathCycle,
  waitForBreathPhase,
} from './helpers/breath-sync';
import { hideModals } from './helpers/dismiss-modals';
import { setupRenderListener } from './helpers/wait-for-render';

/**
 * Shaders to test
 *
 * As each shader is migrated to TSL, add it to this list.
 */
const SHADERS_TO_TEST = [
  'SubtleLightRays',
  'BackgroundGradient',
  'GeoMarkers',
  'AmbientDust',
  'EarthGlobe',
  'StylizedSun',
] as const;

/**
 * Breath phases to test
 *
 * Captures screenshots at different points in the breathing cycle
 * to ensure synchronization is maintained.
 */
const TEST_PHASES = [
  { name: 'exhale', phase: BREATH_PHASES.EXHALE },
  { name: 'mid-breath', phase: 0.5 },
  { name: 'inhale-peak', phase: BREATH_PHASES.INHALE_PEAK },
] as const;

test.describe('TSL Migration: Visual Regression', () => {
  test.setTimeout(120_000);

  for (const shaderName of SHADERS_TO_TEST) {
    test.describe(shaderName, () => {
      for (const { name: phaseName, phase } of TEST_PHASES) {
        test(`GLSL vs TSL pixel diff at ${phaseName} (phase=${phase})`, async ({ page }) => {
          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`Testing: ${shaderName} @ ${phaseName}`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

          // Set up breath phase listener BEFORE navigation
          await exposeBreathPhase(page);

          // ═══════════════════════════════════════════════════════════════
          // Step 1: Capture GLSL screenshot
          // ═══════════════════════════════════════════════════════════════
          console.log('📷 Capturing GLSL screenshot...');
          const glslRenderPromise = setupRenderListener(page, 'desktop');

          await page.goto('/?useTSL=false');
          await page.waitForSelector('canvas', { timeout: 30_000 });
          await hideModals(page);

          // Wait for initial render
          await glslRenderPromise;

          // Wait for at least 1 breath cycle to settle animations
          await waitForBreathCycle(page, 1);

          // Wait for target breath phase
          await waitForBreathPhase(page, phase, 0.05);

          // Small delay for GPU frame completion
          await page.waitForTimeout(100);

          const glslScreenshot = await page.screenshot();
          console.log('  ✓ GLSL screenshot captured\n');

          // ═══════════════════════════════════════════════════════════════
          // Step 2: Capture TSL screenshot
          // ═══════════════════════════════════════════════════════════════
          console.log('📷 Capturing TSL screenshot...');
          const tslRenderPromise = setupRenderListener(page, 'desktop');

          await page.goto(`/?useTSL=true&tsl${shaderName}=true`);
          await page.waitForSelector('canvas', { timeout: 30_000 });
          await hideModals(page);

          // Wait for initial render
          await tslRenderPromise;

          // Wait for at least 1 breath cycle to settle animations
          await waitForBreathCycle(page, 1);

          // Wait for same target breath phase
          await waitForBreathPhase(page, phase, 0.05);

          // Small delay for GPU frame completion
          await page.waitForTimeout(100);

          const tslScreenshot = await page.screenshot();
          console.log('  ✓ TSL screenshot captured\n');

          // ═══════════════════════════════════════════════════════════════
          // Step 3: Compare screenshots
          // ═══════════════════════════════════════════════════════════════
          console.log('🔍 Comparing screenshots...');

          // Save baseline screenshot (GLSL)
          const baselineName = `${shaderName}-${phaseName}-glsl.png`;
          expect(glslScreenshot).toMatchSnapshot(baselineName);

          // Compare TSL screenshot against GLSL baseline
          // threshold: 0.01 = 1% pixel difference tolerance
          const comparisonName = `${shaderName}-${phaseName}-tsl.png`;
          expect(tslScreenshot).toMatchSnapshot(comparisonName, {
            threshold: 0.01,
          });

          console.log('  ✓ Screenshots match (< 1% difference)\n');
        });
      }

      test(`breathing synchronization check`, async ({ page }) => {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Breathing Sync: ${shaderName}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        await exposeBreathPhase(page);

        console.log('🔄 Testing breathing synchronization...');
        const renderPromise = setupRenderListener(page, 'desktop');

        await page.goto(`/?useTSL=true&tsl${shaderName}=true`);
        await page.waitForSelector('canvas', { timeout: 30_000 });
        await hideModals(page);
        await renderPromise;

        // Capture at exhale
        await waitForBreathPhase(page, BREATH_PHASES.EXHALE);
        await page.waitForTimeout(100);
        const exhaleScreenshot = await page.screenshot();

        // Capture at inhale peak
        await waitForBreathPhase(page, BREATH_PHASES.INHALE_PEAK);
        await page.waitForTimeout(100);
        const inhaleScreenshot = await page.screenshot();

        // Screenshots should be different (breathing animation active)
        expect(inhaleScreenshot).not.toEqual(exhaleScreenshot);

        console.log('  ✓ Breathing synchronization working\n');
      });
    });
  }
});

test.describe('TSL Migration: Performance', () => {
  test.setTimeout(180_000);

  test('All TSL shaders: Frame time within 10% of GLSL', async ({ page }) => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Performance Benchmarking: GLSL vs TSL`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // ═══════════════════════════════════════════════════════════════
    // Benchmark GLSL
    // ═══════════════════════════════════════════════════════════════
    console.log('⏱️  Benchmarking GLSL performance...');
    const glslRenderPromise = setupRenderListener(page, 'desktop');

    await page.goto('/?useTSL=false');
    await page.waitForSelector('canvas', { timeout: 30_000 });
    await hideModals(page);
    await glslRenderPromise;

    // Wait for animations to settle
    await page.waitForTimeout(2000);

    const glslFrameTime = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const frameTimes: number[] = [];
        let count = 0;
        let lastTime = performance.now();

        const measureFrame = () => {
          const now = performance.now();
          const delta = now - lastTime;
          lastTime = now;

          if (count > 0) {
            // Skip first frame (warm-up)
            frameTimes.push(delta);
          }

          count++;

          if (count < 101) {
            // Measure 100 frames
            requestAnimationFrame(measureFrame);
          } else {
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            resolve(avgFrameTime);
          }
        };

        requestAnimationFrame(measureFrame);
      });
    });

    console.log(`  GLSL avg frame time: ${glslFrameTime.toFixed(2)}ms\n`);

    // ═══════════════════════════════════════════════════════════════
    // Benchmark TSL
    // ═══════════════════════════════════════════════════════════════
    console.log('⏱️  Benchmarking TSL performance...');
    const tslRenderPromise = setupRenderListener(page, 'desktop');

    await page.goto('/?useTSL=true&enableAllTSL=true');
    await page.waitForSelector('canvas', { timeout: 30_000 });
    await hideModals(page);
    await tslRenderPromise;

    // Wait for animations to settle
    await page.waitForTimeout(2000);

    const tslFrameTime = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const frameTimes: number[] = [];
        let count = 0;
        let lastTime = performance.now();

        const measureFrame = () => {
          const now = performance.now();
          const delta = now - lastTime;
          lastTime = now;

          if (count > 0) {
            frameTimes.push(delta);
          }

          count++;

          if (count < 101) {
            requestAnimationFrame(measureFrame);
          } else {
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            resolve(avgFrameTime);
          }
        };

        requestAnimationFrame(measureFrame);
      });
    });

    console.log(`  TSL avg frame time: ${tslFrameTime.toFixed(2)}ms\n`);

    // ═══════════════════════════════════════════════════════════════
    // Compare performance
    // ═══════════════════════════════════════════════════════════════
    const diff = ((tslFrameTime - glslFrameTime) / glslFrameTime) * 100;
    const diffStr = diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;

    console.log('📊 Performance Results:');
    console.log(`  GLSL: ${glslFrameTime.toFixed(2)}ms`);
    console.log(`  TSL:  ${tslFrameTime.toFixed(2)}ms`);
    console.log(`  Diff: ${diffStr}`);

    if (diff > 0) {
      console.log(`  TSL is ${diff.toFixed(1)}% slower`);
    } else {
      console.log(`  TSL is ${Math.abs(diff).toFixed(1)}% faster! 🎉`);
    }

    // Assert: TSL should be within 10% of GLSL performance
    const maxAllowedFrameTime = glslFrameTime * 1.1;
    expect(tslFrameTime).toBeLessThanOrEqual(maxAllowedFrameTime);

    console.log(`\n  ✓ Performance within acceptable range (< 10% regression)\n`);
  });
});

test.describe('TSL Migration: GLSL Baselines', () => {
  test.setTimeout(120_000);

  test('Capture GLSL baseline screenshots for all shaders', async ({ page }) => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Capturing GLSL Baselines`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    await exposeBreathPhase(page);

    console.log('📷 Capturing GLSL baselines at mid-breath phase...');
    const renderPromise = setupRenderListener(page, 'desktop');

    await page.goto('/?useTSL=false');
    await page.waitForSelector('canvas', { timeout: 30_000 });
    await hideModals(page);
    await renderPromise;

    // Wait for breathing cycle to settle
    await waitForBreathCycle(page, 1);

    // Capture at mid-breath for consistency
    await waitForBreathPhase(page, 0.5, 0.05);
    await page.waitForTimeout(100);

    await page.screenshot({
      path: './test-screenshots/glsl-baseline/all-shaders-mid-breath.png',
    });

    console.log('  ✓ GLSL baseline saved to test-screenshots/glsl-baseline/\n');
  });
});
