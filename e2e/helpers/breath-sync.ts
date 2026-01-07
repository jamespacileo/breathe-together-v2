/**
 * Breath Synchronization Test Helpers
 *
 * Utilities for waiting for specific breathing phases during visual regression testing.
 * Helps ensure consistent screenshots at specific points in the breathing cycle.
 */

import type { Page } from '@playwright/test';

// Extend Window interface for test globals
declare global {
  interface Window {
    __breathPhase?: number;
    __breathPhaseUpdates?: number;
  }
}

/**
 * Expose breath phase for testing
 *
 * Injects a window property that exposes the current breath phase from the app.
 * This must be called BEFORE navigation so the listener is ready when the app loads.
 *
 * @param page Playwright page instance
 */
export async function exposeBreathPhase(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Global breath phase storage
    window.__breathPhase = 0;
    window.__breathPhaseUpdates = 0;

    // Listen for breath phase updates from the app
    window.addEventListener('breathPhaseUpdate', ((event: CustomEvent) => {
      window.__breathPhase = event.detail.phase;
      window.__breathPhaseUpdates = (window.__breathPhaseUpdates ?? 0) + 1;
    }) as EventListener);
  });
}

/**
 * Wait for a specific breath phase
 *
 * Polls the breath phase until it matches the target within the tolerance.
 * Useful for capturing screenshots at consistent breathing states.
 *
 * @param page Playwright page instance
 * @param targetPhase Breath phase to wait for (0.0 = exhale, 1.0 = inhale)
 * @param tolerance Acceptable difference from target (default 0.05 = ±5%)
 * @param timeout Maximum wait time in milliseconds (default 20000ms = 20s)
 *
 * @example
 * ```typescript
 * // Wait for exhale phase
 * await waitForBreathPhase(page, 0.0);
 *
 * // Wait for mid-breath
 * await waitForBreathPhase(page, 0.5, 0.02); // ±2% tolerance
 * ```
 */
export async function waitForBreathPhase(
  page: Page,
  targetPhase: number,
  tolerance = 0.05,
  timeout = 20000,
): Promise<void> {
  const startTime = Date.now();

  await page.waitForFunction(
    ({ target, tol }) => {
      const phase = window.__breathPhase ?? 0;
      const updates = window.__breathPhaseUpdates ?? 0;

      // Require at least one update to ensure we're not using stale data
      if (updates === 0) return false;

      return Math.abs(phase - target) <= tol;
    },
    { target: targetPhase, tol: tolerance },
    { timeout },
  );

  const elapsed = Date.now() - startTime;
  console.log(`  ⏱️  Reached breathPhase=${targetPhase.toFixed(2)} in ${elapsed}ms`);
}

/**
 * Wait for breath cycle completion
 *
 * Waits for at least one full breathing cycle to complete.
 * Useful for ensuring animations have stabilized before taking screenshots.
 *
 * @param page Playwright page instance
 * @param cycles Number of complete cycles to wait (default 1)
 * @param timeout Maximum wait time in milliseconds (default 25000ms per cycle)
 *
 * @example
 * ```typescript
 * // Wait for 1 full breath cycle
 * await waitForBreathCycle(page);
 *
 * // Wait for 2 full cycles (for settling animations)
 * await waitForBreathCycle(page, 2);
 * ```
 */
export async function waitForBreathCycle(page: Page, cycles = 1, timeout = 25000): Promise<void> {
  const cycleTime = 19000; // 4-7-8 cycle = 19 seconds
  const waitTime = cycleTime * cycles;

  console.log(`  ⏳ Waiting for ${cycles} breath cycle(s) (${waitTime}ms)...`);

  await page.waitForTimeout(Math.min(waitTime, timeout));

  console.log(`  ✓ Breath cycle(s) complete`);
}

/**
 * Get current breath phase
 *
 * Returns the current breath phase value. Useful for debugging or logging.
 *
 * @param page Playwright page instance
 * @returns Current breath phase (0-1) or null if not available
 */
export async function getBreathPhase(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    return window.__breathPhase ?? null;
  });
}

/**
 * Breath phase constants for common test scenarios
 */
export const BREATH_PHASES = {
  /** Exhale complete (start of cycle) */
  EXHALE: 0.0,

  /** Mid-inhale */
  INHALE_MID: 0.25,

  /** Inhale complete (hold-in start) */
  INHALE_PEAK: 0.5,

  /** Mid-hold */
  HOLD_MID: 0.65,

  /** Start of exhale */
  EXHALE_START: 0.75,

  /** Mid-exhale */
  EXHALE_MID: 0.9,
} as const;

/**
 * Capture screenshots at multiple breath phases
 *
 * Helper function that captures screenshots at specified breath phases.
 * Returns an array of screenshot buffers.
 *
 * @param page Playwright page instance
 * @param phases Array of breath phases to capture (e.g., [0.0, 0.5, 1.0])
 * @param tolerance Phase matching tolerance (default 0.05)
 * @returns Array of screenshot buffers
 *
 * @example
 * ```typescript
 * const screenshots = await captureBreathPhases(page, [
 *   BREATH_PHASES.EXHALE,
 *   BREATH_PHASES.INHALE_PEAK,
 * ]);
 * ```
 */
export async function captureBreathPhases(
  page: Page,
  phases: number[],
  tolerance = 0.05,
): Promise<Buffer[]> {
  const screenshots: Buffer[] = [];

  for (const phase of phases) {
    await waitForBreathPhase(page, phase, tolerance);
    // Wait a tiny bit for rendering to stabilize
    await page.waitForTimeout(100);
    const screenshot = await page.screenshot();
    screenshots.push(screenshot);
  }

  return screenshots;
}
