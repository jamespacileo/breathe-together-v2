/**
 * Rendering Configuration
 *
 * Configuration for the TSL (Three.js Shading Language) rendering system.
 *
 * ## Architecture
 *
 * All materials use TSL (Three.js Shading Language) which compiles to:
 * - WebGL 2 (GLSL) for broad browser compatibility
 * - WebGPU (WGSL) when native WebGPU support matures
 *
 * The app uses WebGPURenderer with forceWebGL: true to get the benefits of
 * TSL's node-based material system while maintaining WebGL 2 compatibility
 * for Safari and other browsers without native WebGPU support.
 *
 * ## Browser Support
 *
 * - All modern browsers via WebGL 2 fallback
 * - Chrome 113+, Edge 113+, Firefox 121+, Safari 17.4+ will use native WebGPU
 *   once forceWebGL is set to false
 */

/**
 * Rendering configuration options
 */
export interface RenderingConfig {
  /**
   * Force WebGL 2 backend instead of native WebGPU
   *
   * When true, WebGPURenderer uses WebGL 2 backend (broad compatibility)
   * When false, WebGPURenderer uses native WebGPU (better performance)
   *
   * @default true - WebGL 2 for Safari and broader compatibility
   */
  forceWebGL: boolean;
}

/**
 * Default rendering configuration
 *
 * Uses WebGL 2 backend for maximum browser compatibility.
 */
export const DEFAULT_RENDERING_CONFIG: RenderingConfig = {
  forceWebGL: true,
};

/**
 * Current rendering configuration
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
 * @param updates Partial config updates to merge
 */
export function updateRenderingConfig(updates: Partial<RenderingConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...updates,
  };
}

/**
 * Reset to default configuration
 */
export function resetRenderingConfig(): void {
  currentConfig = { ...DEFAULT_RENDERING_CONFIG };
}

/**
 * Check if native WebGPU should be used
 *
 * @returns true if native WebGPU renderer should be used (forceWebGL is false)
 */
export function shouldUseNativeWebGPU(): boolean {
  return !currentConfig.forceWebGL;
}

/**
 * Development helper: Log current rendering config
 */
export function logRenderingConfig(): void {
  const config = getRenderingConfig();
  console.group('🎨 Rendering Configuration');
  console.log('Renderer: WebGPURenderer');
  console.log('Backend:', config.forceWebGL ? 'WebGL 2 (fallback)' : 'Native WebGPU');
  console.log('Materials: TSL (Three.js Shading Language)');
  console.groupEnd();
}
