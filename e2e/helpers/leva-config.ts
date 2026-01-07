import type { Page } from '@playwright/test';

/**
 * Common Leva control keys for validation
 * These are the most commonly used controls for visual testing
 */
export const COMMON_LEVA_CONTROLS = [
  'usePostprocessingDoF',

  // Atmosphere
  'atmosphereParticleSize',
  'atmosphereBaseOpacity',
  'atmosphereBreathingOpacity',

  // DoF
  'enableDepthOfField',
  'focusDistance',
  'focalRange',
  'maxBlur',

  // Environment
  'showClouds',
  'showStars',
  'cloudOpacity',
  'ambientLightColor',
  'ambientLightIntensity',

  // Shard Swarm
  'showShardShells',

  // Colors
  'backgroundColor',
  'globeColor',

  // Postprocessing
  'ppFocalLength',
  'ppBokehScale',
] as const;

export type LevaConfig = Record<string, unknown>;

/**
 * Inject Leva configuration into the page
 * Requires __LEVA_SET__ to be exposed on window (from useDevControls hook)
 */
export async function injectLevaConfig(page: Page, config: LevaConfig): Promise<void> {
  // Wait for the Leva bridge to be available
  await page.waitForFunction(
    () => typeof (window as unknown as { __LEVA_SET__?: unknown }).__LEVA_SET__ === 'function',
    { timeout: 10_000 },
  );

  // Inject the configuration
  await page.evaluate((cfg) => {
    const win = window as unknown as { __LEVA_SET__: (config: LevaConfig) => void };
    win.__LEVA_SET__(cfg);
  }, config);

  // Wait for config to take effect
  await page.waitForTimeout(100);
}

/**
 * Get current Leva configuration from the page
 */
export async function getLevaConfig(page: Page): Promise<LevaConfig | null> {
  try {
    return await page.evaluate(() => {
      const win = window as unknown as { __LEVA_GET__?: () => LevaConfig };
      return win.__LEVA_GET__?.() ?? null;
    });
  } catch {
    return null;
  }
}

/**
 * Parse LEVA_CONFIG environment variable
 */
export function parseLevaConfigEnv(): LevaConfig | null {
  const envConfig = process.env.LEVA_CONFIG;
  if (!envConfig) return null;

  try {
    return JSON.parse(envConfig) as LevaConfig;
  } catch (error) {
    console.warn('Failed to parse LEVA_CONFIG:', error);
    return null;
  }
}
