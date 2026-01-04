import type { Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load breathing config from shared source of truth
const breathConfig = JSON.parse(readFileSync(join(__dirname, '../breath-config.json'), 'utf-8'));

export const BREATH_PHASES = {
  inhale: { start: 0, end: breathConfig.breathPhases.inhale },
  holdIn: {
    start: breathConfig.breathPhases.inhale,
    end: breathConfig.breathPhases.inhale + breathConfig.breathPhases.holdIn,
  },
  exhale: {
    start: breathConfig.breathPhases.inhale + breathConfig.breathPhases.holdIn,
    end:
      breathConfig.breathPhases.inhale +
      breathConfig.breathPhases.holdIn +
      breathConfig.breathPhases.exhale,
  },
};

export const CYCLE_DURATION = BREATH_PHASES.exhale.end;

/**
 * Get current position in the breathing cycle (0 to CYCLE_DURATION seconds)
 */
export function getCyclePosition(): number {
  return (Date.now() / 1000) % CYCLE_DURATION;
}

/**
 * Get milliseconds until midpoint of target phase
 */
export function getMsUntilPhase(phase: keyof typeof BREATH_PHASES): number {
  const boundaries = BREATH_PHASES[phase];
  const mid = (boundaries.start + boundaries.end) / 2;
  let wait = mid - getCyclePosition();
  if (wait < 0.5) wait += CYCLE_DURATION; // Wait for next cycle if too close
  return Math.ceil(wait * 1000);
}

/**
 * Get current phase name
 */
export function getCurrentPhase(): string {
  const pos = getCyclePosition();
  if (pos < BREATH_PHASES.inhale.end) return 'inhale';
  if (pos < BREATH_PHASES.holdIn.end) return 'holdIn';
  return 'exhale';
}

/**
 * Wait for WebGL canvas to be ready and rendering
 */
export async function waitForCanvas(page: Page, timeout = 30000): Promise<void> {
  // Wait for canvas element
  await page.waitForSelector('canvas', { timeout });

  // Wait for canvas to have content (not blank)
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('canvas');
      if (!canvas || canvas.width === 0 || canvas.height === 0) return false;

      // Check WebGL context has rendered something
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return true; // Not WebGL, assume ready

      // Sample a pixel to verify rendering
      const pixels = new Uint8Array(4);
      gl.readPixels(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels,
      );
      return pixels.some((v) => v !== 0);
    },
    { timeout },
  );

  // Small buffer for Three.js to stabilize
  await page.waitForTimeout(1000);
}

/**
 * Wait for a specific breathing phase, then execute callback
 */
export async function atPhase<T>(
  page: Page,
  phase: keyof typeof BREATH_PHASES,
  callback: () => Promise<T>,
): Promise<T> {
  const ms = getMsUntilPhase(phase);
  if (ms > 100) {
    await page.waitForTimeout(ms);
  }
  return callback();
}
