/**
 * Particle Visual Configuration
 *
 * Type-safe configuration interfaces for particle appearance (geometry, material, size).
 * Supports different visual configurations for user vs filler particles.
 */

import * as THREE from 'three';

/**
 * Geometry configuration for particles
 *
 * Defines which Three.js geometry type to use and its parameters.
 * All sizes normalized to 1.0 (scaling applied in ParticleRenderer via baseScale).
 */
export interface ParticleGeometryConfig {
  /**
   * Particle geometry type (shape).
   *
   * **When to adjust:** Match aesthetic (icosahedron = smooth/organic, box = geometric, sphere = balanced)
   * **Typical range:** icosahedron (smooth) → sphere (balanced) → box (angular)
   * **Performance note:** All geometries have similar performance; complexity determined by detail level
   *
   * @default "icosahedron"
   */
  type: 'icosahedron' | 'sphere' | 'box' | 'octahedron' | 'tetrahedron';

  /**
   * Base geometry size (normalized to 1.0, scaled via ParticleSizeConfig.baseScale).
   *
   * Direct Three.js geometry size parameter. Final render size = size × baseScale × PARTICLE_SIZE.
   *
   * **When to adjust:** Almost never—use baseScale in ParticleSizeConfig for visual scaling
   * **Typical range:** 1.0 (normalized, scaled via baseScale)
   *
   * @min 0.1
   * @max 5.0
   * @step 0.1
   * @default 1.0
   */
  size: number;

  /**
   * Geometric detail level / segment count (affects smoothness and complexity).
   *
   * Higher values = smoother but more vertices. Impact varies by geometry:
   * - icosahedron: 0-4 (0=rough, 4=very smooth)
   * - sphere: 8-64 (segments in width/height)
   * - box: 1 (no effect, for consistency)
   * - octahedron: 0-3 (0=rough, 3=smooth)
   * - tetrahedron: 0-2 (0=rough, 2=smooth)
   *
   * **When to adjust:** Smooth look (detail 3-4), balanced (2), sharp (0-1)
   * **Typical range:** Low (0, angular) → Medium (2, balanced) → High (4, smooth)
   * **Performance note:** Linear vertex count increase; negligible GPU impact per detail level
   *
   * @min 0
   * @max 4
   * @step 1
   * @default 2
   */
  detail: number;
}

/**
 * Material configuration for particles
 *
 * Defines Three.js material type and rendering properties.
 */
export interface ParticleMaterialConfig {
  /**
   * Material type (affects shading and appearance).
   *
   * **When to adjust:** basic = fast/flat, standard = realistic/metallic, lambert = matte
   * **Typical range:** basic (fast/glowing) → lambert (matte) → standard (realistic)
   * **Performance note:** basic < lambert < standard; basic recommended for 300+ particles
   *
   * @default "basic"
   */
  type: 'basic' | 'standard' | 'lambert';

  /**
   * Enable transparency (alpha blending).
   *
   * Required for additive blending mode. Slight performance cost on mobile.
   *
   * **When to adjust:** true (for glowing particles), false (opaque particles, faster)
   * **Interacts with:** blending (AdditiveBlending requires transparent=true)
   * **Performance note:** Small impact on mobile; negligible on desktop
   *
   * @default true
   */
  transparent: boolean;

  /**
   * Write to depth buffer (controls depth sorting).
   *
   * false = particles always render in front regardless of depth (additive style).
   * true = normal depth-based rendering (might occlude other objects).
   *
   * **When to adjust:** false (for glowing effect), true (for occlusion/depth)
   * **Interacts with:** blending (AdditiveBlending typically uses depthWrite=false)
   *
   * @default false
   */
  depthWrite: boolean;

  /**
   * Blending mode (how particles composite with scene background).
   *
   * AdditiveBlending = glowing bright overlay. NormalBlending = standard compositing.
   *
   * **When to adjust:** THREE.AdditiveBlending (glowing), THREE.NormalBlending (flat)
   * **Typical range:** AdditiveBlending (glow) → NormalBlending (normal)
   *
   * @default THREE.AdditiveBlending
   */
  blending: THREE.Blending;

  /**
   * Emissive intensity for basic/standard material (glow effect intensity).
   *
   * Only applies to basic and standard material types. Controls how bright the particle glows.
   *
   * **When to adjust:** 0.0 (no glow), 0.3-0.5 (subtle), 0.8+ (bright/intense)
   * **Typical range:** None (0.0) → Subtle (0.3) → Medium (0.5) → Bright (0.8)
   * **Interacts with:** transparent (should be true for glow to work), blending (AdditiveBlending)
   *
   * @min 0.0
   * @max 1.0
   * @step 0.1
   * @default 0.5
   */
  emissiveIntensity?: number;
}

/**
 * Size and scale configuration for particles
 *
 * Controls particle size and how they respond to breathing animation.
 */
export interface ParticleSizeConfig {
  /**
   * Base scale multiplier for particle size (final = geometry.size × baseScale × PARTICLE_SIZE).
   *
   * **When to adjust:** Make particles smaller (0.5-0.8) for density, larger (1.2-2.0) for prominence
   * **Typical range:** Small (0.5, packed) → Standard (1.0, normal) → Large (1.5, prominent) → Huge (2.0+, dominant)
   * **Interacts with:** particleCount (more particles = reduce baseScale for density), breathPulseIntensity
   *
   * Examples:
   * - 0.5 = half size (packed, many visible)
   * - 1.0 = normal (particle size from Fibonacci layout)
   * - 1.5 = 50% larger
   * - 2.0 = double size (dominant focal point)
   *
   * @min 0.1
   * @max 3.0
   * @step 0.1
   * @default 1.0
   */
  baseScale: number;

  /**
   * Breathing pulse intensity multiplier (scale variation with breath cycle).
   *
   * Applied as: final_scale = baseScale × (1.0 + breathPhase × breathPulseIntensity).
   * breathPhase ranges 0-1 per phase, so result scales from baseScale to baseScale×(1+breathPulseIntensity).
   *
   * **When to adjust:** Subtle (0.05-0.1) for delicate effect, strong (0.2-0.5) for synchronized breathing visibility
   * **Typical range:** None (0.0) → Subtle (0.1, ±5%) → Medium (0.2, ±10%) → Strong (0.5, ±25%)
   * **Interacts with:** baseScale (intensity is relative), visual presence emphasis
   *
   * Examples:
   * - 0.0 = static particles (no breathing pulse)
   * - 0.1 = subtle pulse (±5% size variation)
   * - 0.2 = medium pulse (±10% size variation)
   * - 0.5 = strong pulse (±25% size variation)
   *
   * @min 0.0
   * @max 1.0
   * @step 0.05
   * @default 0.2
   */
  breathPulseIntensity: number;
}

/**
 * Complete visual configuration for particles
 *
 * Combines geometry, material, and size settings into a single configuration object.
 * Typically used as userConfig or fillerConfig in ParticleRenderer.
 */
export interface ParticleVisualConfig {
  geometry: ParticleGeometryConfig;
  material: ParticleMaterialConfig;
  size: ParticleSizeConfig;
}

/**
 * Default configuration for user particles
 *
 * Characteristics:
 * - Larger particles (1.2x base size)
 * - Stronger breathing pulse (20% intensity)
 * - Brighter glow (0.5 emissive intensity)
 * - Smooth icosahedrons (detail: 2)
 *
 * Represents particles from connected users breathing together.
 */
export const DEFAULT_USER_PARTICLE_CONFIG: ParticleVisualConfig = {
  geometry: {
    type: 'icosahedron',
    size: 1,
    detail: 2,
  },
  material: {
    type: 'basic',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  },
  size: {
    baseScale: 1.2,
    breathPulseIntensity: 0.2,
  },
};

/**
 * Default configuration for filler particles
 *
 * Characteristics:
 * - Smaller particles (0.8x base size)
 * - Subtle breathing pulse (10% intensity)
 * - Dimmer glow (0.3 emissive intensity)
 * - Smooth icosahedrons (detail: 2)
 *
 * Represents placeholder particles when fewer than 300 users are connected.
 */
export const DEFAULT_FILLER_PARTICLE_CONFIG: ParticleVisualConfig = {
  geometry: {
    type: 'icosahedron',
    size: 1,
    detail: 2,
  },
  material: {
    type: 'basic',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  },
  size: {
    baseScale: 0.8,
    breathPulseIntensity: 0.1,
  },
};
