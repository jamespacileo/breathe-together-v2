/**
 * SceneDepthEffects - Unified depth enhancement system
 *
 * Combines all depth-creating effects into a single manageable component:
 * - Multi-layer atmospheric particles
 * - Depth-stratified star field
 * - Distant silhouette mountains
 * - Orbital depth rings
 * - Nebula cloud layers
 * - Enhanced light rays
 * - Subtle ground plane
 * - Parallax background layers
 * - Depth fog
 * - Screen-space vignette
 *
 * All effects are optional and can be individually toggled for performance
 * tuning or artistic preference.
 */

import { memo } from 'react';
import { DepthAtmosphericLayers } from './DepthAtmosphericLayers';
import { DepthFog } from './DepthFog';
import { DepthLightRays } from './DepthLightRays';
import { DepthRings } from './DepthRings';
import { DepthStarField } from './DepthStarField';
import { DepthVignette } from './DepthVignette';
import { DistantSilhouettes } from './DistantSilhouettes';
import { FloatingObjects } from './FloatingObjects';
import { NebulaLayers } from './NebulaLayers';
import { ParallaxBackground } from './ParallaxBackground';
import { SubtleGroundPlane } from './SubtleGroundPlane';

export interface SceneDepthEffectsProps {
  /**
   * Master enable for all depth effects
   * @default true
   */
  enabled?: boolean;

  /**
   * Global opacity multiplier for all effects
   * @default 1.0
   * @min 0
   * @max 2
   */
  globalOpacity?: number;

  /**
   * Global density multiplier (affects particle counts)
   * @default 1.0
   * @min 0.25
   * @max 2
   */
  globalDensity?: number;

  // Individual effect toggles
  /**
   * Enable atmospheric particle layers
   * @default true
   */
  enableAtmosphericLayers?: boolean;

  /**
   * Enable depth star field
   * @default true
   */
  enableStarField?: boolean;

  /**
   * Enable distant silhouettes
   * @default true
   */
  enableSilhouettes?: boolean;

  /**
   * Enable orbital depth rings
   * @default true
   */
  enableRings?: boolean;

  /**
   * Enable nebula cloud layers
   * @default true
   */
  enableNebula?: boolean;

  /**
   * Enable depth light rays
   * @default true
   */
  enableLightRays?: boolean;

  /**
   * Enable subtle ground plane
   * @default true
   */
  enableGroundPlane?: boolean;

  /**
   * Enable parallax background
   * @default true
   */
  enableParallax?: boolean;

  /**
   * Enable depth fog
   * @default false (disabled by default as it can wash out the gradient)
   */
  enableFog?: boolean;

  /**
   * Enable screen-space vignette
   * @default true
   */
  enableVignette?: boolean;

  /**
   * Enable floating geometric objects
   * @default true
   */
  enableFloatingObjects?: boolean;

  // Effect-specific overrides
  /**
   * Vignette intensity
   * @default 0.35
   */
  vignetteIntensity?: number;

  /**
   * Silhouette random seed
   * @default 42
   */
  silhouetteSeed?: number;
}

/**
 * SceneDepthEffects - Master depth enhancement component
 *
 * Renders all depth-creating effects in the proper order (back to front)
 * with configurable toggles for each effect type.
 *
 * Performance levels:
 * - Minimal: Only vignette + ground plane
 * - Low: + silhouettes + star field
 * - Medium: + nebula + light rays
 * - High: + atmospheric layers + rings + parallax
 * - Full: All effects + fog
 */
export const SceneDepthEffects = memo(function SceneDepthEffects({
  enabled = true,
  globalOpacity = 1.0,
  globalDensity = 1.0,
  enableAtmosphericLayers = true,
  enableStarField = true,
  enableSilhouettes = true,
  enableRings = true,
  enableNebula = true,
  enableLightRays = true,
  enableGroundPlane = true,
  enableParallax = true,
  enableFog = false, // Disabled by default
  enableVignette = true,
  enableFloatingObjects = true,
  vignetteIntensity = 0.35,
  silhouetteSeed = 42,
}: SceneDepthEffectsProps) {
  if (!enabled) return null;

  return (
    <group name="SceneDepthEffects">
      {/* Fog - scene-level effect (renders nothing visible) */}
      <DepthFog enabled={enableFog} />

      {/* Back to front rendering order for proper depth sorting */}

      {/* Deepest background elements */}
      <DepthStarField enabled={enableStarField} opacity={globalOpacity} density={globalDensity} />

      <DistantSilhouettes
        enabled={enableSilhouettes}
        opacity={globalOpacity}
        seed={silhouetteSeed}
      />

      {/* Mid-depth elements */}
      <NebulaLayers enabled={enableNebula} opacity={globalOpacity} />

      <DepthRings enabled={enableRings} opacity={globalOpacity} />

      <ParallaxBackground enabled={enableParallax} opacity={globalOpacity} />

      {/* Near-depth elements */}
      <DepthAtmosphericLayers
        enabled={enableAtmosphericLayers}
        opacity={globalOpacity}
        density={globalDensity}
      />

      <DepthLightRays enabled={enableLightRays} opacity={globalOpacity} />

      {/* Floating geometric objects */}
      <FloatingObjects enabled={enableFloatingObjects} opacity={globalOpacity} />

      {/* Ground reference */}
      <SubtleGroundPlane enabled={enableGroundPlane} opacity={globalOpacity * 0.04} />

      {/* Screen-space overlay (renders last) */}
      <DepthVignette enabled={enableVignette} intensity={vignetteIntensity * globalOpacity} />
    </group>
  );
});

export default SceneDepthEffects;

// Re-export individual components for granular use
export { DepthAtmosphericLayers } from './DepthAtmosphericLayers';
export { DepthFog } from './DepthFog';
export { DepthLightRays } from './DepthLightRays';
export { DepthRings } from './DepthRings';
export { DepthStarField } from './DepthStarField';
export { DepthVignette } from './DepthVignette';
export { DistantSilhouettes } from './DistantSilhouettes';
export { FloatingObjects } from './FloatingObjects';
export { NebulaLayers } from './NebulaLayers';
export { ParallaxBackground } from './ParallaxBackground';
export { SubtleGroundPlane } from './SubtleGroundPlane';
