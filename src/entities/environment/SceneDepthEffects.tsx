/**
 * SceneDepthEffects - Unified depth enhancement system
 *
 * Combines all depth-creating effects into a single component:
 * - Multi-layer atmospheric particles (parallax)
 * - Depth-based star layers
 * - Nebula/cloud layers
 * - Distant silhouettes
 * - Orbital rings
 * - Light rays at multiple depths
 * - Ground plane
 * - Vignette
 * - Exponential fog
 * - Parallax background layers
 *
 * All effects are designed to work together creating a cohesive
 * sense of vast 3D space around the central globe.
 */

import { DepthFog } from './DepthFog';
import { DepthParticleLayers } from './DepthParticleLayers';
import { DepthStarLayers } from './DepthStarLayers';
import { DepthVignette } from './DepthVignette';
import { DistantSilhouettes } from './DistantSilhouettes';
import { GroundPlane } from './GroundPlane';
import { NebulaLayers } from './NebulaLayers';
import { OrbitalRings } from './OrbitalRings';
import { ParallaxLayers } from './ParallaxLayers';
import { SubtleLightRays } from './SubtleLightRays';

export interface SceneDepthEffectsProps {
  /** Master enable/disable for all depth effects */
  enabled?: boolean;

  /** Enable atmospheric particles */
  enableParticles?: boolean;
  /** Enable star layers */
  enableStars?: boolean;
  /** Enable nebula layers */
  enableNebula?: boolean;
  /** Enable distant silhouettes */
  enableSilhouettes?: boolean;
  /** Enable orbital rings */
  enableRings?: boolean;
  /** Enable ground plane */
  enableGround?: boolean;
  /** Enable vignette */
  enableVignette?: boolean;
  /** Enable fog */
  enableFog?: boolean;
  /** Enable parallax layers */
  enableParallax?: boolean;
  /** Enable light rays */
  enableLightRays?: boolean;

  /** Overall intensity multiplier (affects opacity of all effects) */
  intensity?: number;
}

export function SceneDepthEffects({
  enabled = true,
  enableParticles = true,
  enableStars = true,
  enableNebula = true,
  enableSilhouettes = true,
  enableRings = true,
  enableGround = true,
  enableVignette = true,
  enableFog = false, // Disabled by default - can wash out the scene
  enableParallax = true,
  enableLightRays = true,
  intensity = 1,
}: SceneDepthEffectsProps) {
  if (!enabled) return null;

  return (
    <group name="scene-depth-effects">
      {/* Background layers (furthest back) */}
      <ParallaxLayers enabled={enableParallax} opacity={intensity} />

      {/* Far distant elements */}
      <DistantSilhouettes enabled={enableSilhouettes} opacity={intensity} />
      <DepthStarLayers enabled={enableStars} opacity={intensity} />

      {/* Mid-distance atmospheric effects */}
      <NebulaLayers enabled={enableNebula} opacity={intensity} />
      <SubtleLightRays enabled={enableLightRays} opacity={0.04 * intensity} />

      {/* Orbital structure */}
      <OrbitalRings enabled={enableRings} opacity={intensity} />

      {/* Near atmospheric particles */}
      <DepthParticleLayers enabled={enableParticles} opacity={intensity} />

      {/* Ground reference */}
      <GroundPlane enabled={enableGround} opacity={intensity} />

      {/* Atmospheric fog (affects all 3D objects) */}
      <DepthFog enabled={enableFog} />

      {/* Screen-space vignette (rendered last) */}
      <DepthVignette enabled={enableVignette} intensity={0.4 * intensity} />
    </group>
  );
}

export { DepthFog } from './DepthFog';
// Re-export individual components for granular control
export { DepthParticleLayers } from './DepthParticleLayers';
export { DepthStarLayers } from './DepthStarLayers';
export { DepthVignette } from './DepthVignette';
export { DistantSilhouettes } from './DistantSilhouettes';
export { GroundPlane } from './GroundPlane';
export { NebulaLayers } from './NebulaLayers';
export { OrbitalRings } from './OrbitalRings';
export { ParallaxLayers } from './ParallaxLayers';
