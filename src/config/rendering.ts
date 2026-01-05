/**
 * Rendering Configuration
 *
 * Feature flags and configuration for shader/material rendering modes.
 * This allows gradual migration to TSL while maintaining GLSL fallbacks.
 *
 * ## Migration Strategy
 *
 * 1. **Phase 1 (Current)**: GLSL production, TSL experimental
 *    - `useTSL: false` - Use GLSL ShaderMaterial for all production materials
 *    - TSL materials available for testing but not default
 *
 * 2. **Phase 2**: TSL opt-in
 *    - Set `useTSL: true` to use TSL materials
 *    - Falls back to GLSL if TSL compilation fails
 *
 * 3. **Phase 3**: TSL default
 *    - TSL is production default
 *    - GLSL kept as fallback for edge cases
 *
 * ## WebGPU Support
 *
 * TSL materials compile to both WebGL2 (GLSL) and WebGPU (WGSL).
 * WebGPU can be enabled when browser support is mature:
 * - Chrome 113+, Edge 113+, Firefox 121+, Safari 17.4+
 *
 * @see docs/shader-architecture-review.md for full migration plan
 */

/**
 * Rendering feature flags
 */
export interface RenderingConfig {
  /**
   * Enable TSL (Three.js Shading Language) materials
   *
   * When true, use TSL-based materials that compile to both WebGL2 and WebGPU.
   * When false, use traditional GLSL ShaderMaterial.
   *
   * @default false - GLSL is still production default
   */
  useTSL: boolean;

  /**
   * Force WebGPU renderer
   *
   * When true and browser supports WebGPU, use WebGPURenderer.
   * When false, use WebGLRenderer with TSL compiling to GLSL.
   *
   * Note: Requires useTSL: true to have any effect.
   *
   * @default false - WebGL2 is still default
   */
  forceWebGPU: boolean;

  /**
   * Enable experimental features
   *
   * These are features that are still in development and may not be stable.
   */
  experimental: {
    /**
     * Use TSL refraction pipeline
     *
     * The 4-pass refraction pipeline is complex. This enables a TSL version
     * which is still being developed.
     *
     * @default false
     */
    tslRefractionPipeline: boolean;

    /**
     * Use TSL background gradient
     *
     * Enable the TSL version of BackgroundGradient.
     *
     * @default false
     */
    tslBackgroundGradient: boolean;

    /**
     * Use TSL globe materials
     *
     * Enable TSL materials for EarthGlobe.
     *
     * @default false
     */
    tslGlobeMaterials: boolean;

    /**
     * Use TSL particle materials
     *
     * Enable TSL materials for ParticleSwarm (FrostedGlassMaterial).
     *
     * @default false
     */
    tslParticleMaterials: boolean;
  };
}

/**
 * Default rendering configuration
 *
 * Production-safe defaults with TSL disabled until proven stable.
 */
export const DEFAULT_RENDERING_CONFIG: RenderingConfig = {
  useTSL: false,
  forceWebGPU: false,
  experimental: {
    tslRefractionPipeline: false,
    tslBackgroundGradient: false,
    tslGlobeMaterials: false,
    tslParticleMaterials: false,
  },
};

/**
 * Current rendering configuration
 *
 * This can be modified at runtime for A/B testing or development.
 * In production, this should match DEFAULT_RENDERING_CONFIG.
 */
let currentConfig: RenderingConfig = { ...DEFAULT_RENDERING_CONFIG };

/**
 * Get the current rendering configuration
 */
export function getRenderingConfig(): Readonly<RenderingConfig> {
  return currentConfig;
}

/**
 * Update rendering configuration
 *
 * Typically called during app initialization or for A/B testing.
 *
 * @param updates Partial config updates to merge
 */
export function updateRenderingConfig(updates: Partial<RenderingConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...updates,
    experimental: {
      ...currentConfig.experimental,
      ...(updates.experimental || {}),
    },
  };
}

/**
 * Enable all TSL features (for testing)
 *
 * Enables TSL materials across the app. Use for development/testing only.
 */
export function enableAllTSL(): void {
  updateRenderingConfig({
    useTSL: true,
    experimental: {
      tslRefractionPipeline: false, // Keep disabled - most complex
      tslBackgroundGradient: true,
      tslGlobeMaterials: true,
      tslParticleMaterials: true,
    },
  });
}

/**
 * Reset to default configuration
 */
export function resetRenderingConfig(): void {
  currentConfig = { ...DEFAULT_RENDERING_CONFIG };
}

/**
 * Check if TSL should be used for a specific feature
 *
 * @param feature The experimental feature to check
 * @returns true if TSL should be used for this feature
 */
export function shouldUseTSL(feature: keyof RenderingConfig['experimental']): boolean {
  const config = getRenderingConfig();

  // Master switch must be on
  if (!config.useTSL) {
    return false;
  }

  // Check specific feature flag
  return config.experimental[feature];
}

/**
 * Check if WebGPU renderer should be used
 *
 * @returns true if WebGPU renderer should be attempted
 */
export function shouldUseWebGPU(): boolean {
  const config = getRenderingConfig();

  // Both TSL and forceWebGPU must be enabled
  return config.useTSL && config.forceWebGPU;
}

/**
 * Development helper: Log current rendering config
 */
export function logRenderingConfig(): void {
  const config = getRenderingConfig();
  console.group('🎨 Rendering Configuration');
  console.log('TSL Materials:', config.useTSL ? '✅ Enabled' : '❌ Disabled');
  console.log('WebGPU Renderer:', config.forceWebGPU ? '✅ Forced' : '❌ WebGL2');
  console.group('Experimental Features:');
  for (const [key, value] of Object.entries(config.experimental)) {
    console.log(`  ${key}:`, value ? '✅' : '❌');
  }
  console.groupEnd();
  console.groupEnd();
}
