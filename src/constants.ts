/**
 * Shared constants used across the frontend
 * Single source of truth for mood and avatar IDs
 */

/**
 * Mood IDs - simplified 4-category system with positive framing
 *
 * Each mood maps to a distinct color in the Monument Valley palette:
 * - gratitude (gold) - Appreciating this moment
 * - presence (teal) - Simply being here (covers calm, curiosity, rest, no specific intention)
 * - release (blue) - Letting go
 * - connection (rose) - Here with others
 */
export const MOOD_IDS = ['gratitude', 'presence', 'release', 'connection'] as const;

export type MoodId = (typeof MOOD_IDS)[number];

/**
 * Mood metadata for UI display
 */
export const MOOD_METADATA: Record<MoodId, { label: string; description: string }> = {
  gratitude: {
    label: 'Gratitude',
    description: 'Appreciating this moment',
  },
  presence: {
    label: 'Presence',
    description: 'Simply being here',
  },
  release: {
    label: 'Release',
    description: 'Letting go',
  },
  connection: {
    label: 'Connection',
    description: 'Here with others',
  },
};

/**
 * Breathing Cycle Configuration
 *
 * 4-7-8 relaxation breathing pattern (Dr. Andrew Weil's technique):
 * - Inhale for 4 seconds
 * - Hold for 7 seconds
 * - Exhale for 8 seconds
 * - No hold after exhale (immediate transition to next inhale)
 *
 * Total cycle = 19 seconds
 *
 * To customize timing, simply change these values.
 * All derived calculations (orbit radius, animations) adapt automatically.
 */
export const BREATH_PHASES = {
  INHALE: 4,
  HOLD_IN: 7,
  EXHALE: 8,
  HOLD_OUT: 0,
} as const;

/** Total breathing cycle duration (derived from phase durations) */
export const BREATH_TOTAL_CYCLE =
  BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN + BREATH_PHASES.EXHALE + BREATH_PHASES.HOLD_OUT;

/**
 * Visual Constants - Breathing animation parameters
 *
 * IMPORTANT: PARTICLE_ORBIT_MIN must be >= minOrbitRadius in ParticleSwarm
 * (globeRadius + shardSize + buffer ≈ 1.5 + 0.6 + 0.3 = 2.4)
 * Otherwise, particles hit the clamp early and animation appears to stop.
 *
 * The full orbit range is used by the sin easing curve - if min is too low,
 * particles will reach their physical limit before the easing completes,
 * causing the animation to appear shorter than the phase duration.
 */
export const VISUALS = {
  /** Min orbit radius (inhale - particles closest to globe)
   * Must be >= globeRadius + maxShardSize + buffer to avoid early clamp */
  PARTICLE_ORBIT_MIN: 2.5,
  /** Max orbit radius (exhale - particles farthest from globe) */
  PARTICLE_ORBIT_MAX: 6.0,
} as const;

/**
 * Hold Phase Oscillation Parameters
 *
 * Creates subtle "breathing" during hold phases using underdamped harmonic oscillator.
 * Nothing in nature is perfectly still - these parameters add organic micro-movement.
 *
 * Tuning history:
 * - amplitude: 0.4% (reduced from 1.2% to avoid visible "bounce" before exhale)
 * - damping: 0.6 (increased to settle faster during hold)
 * - frequency: 1.0 (reduced from 1.5 for gentler rhythm)
 */
export const HOLD_OSCILLATION = {
  /** Very subtle micro-movement amplitude (0.4%) */
  AMPLITUDE: 0.004,
  /** Damping factor - reduces amplitude over hold phase */
  DAMPING: 0.6,
  /** Oscillation frequency - cycles per hold phase */
  FREQUENCY: 1.0,
} as const;

/**
 * THREE.js Render Layers for Selective Rendering
 *
 * Used by RefractionPipeline to render specific object groups per pass:
 * - ENVIRONMENT (0): Default layer for all scene objects
 * - GLOBE (1): Central EarthGlobe (reserved for future selective rendering)
 * - PARTICLES (2): ParticleSwarm shards - used for backface pass layer filtering
 * - EFFECTS (3): AtmosphericParticles, sparkles (reserved for future use)
 *
 * Note: Background gradient is cached separately via envFBO caching, not layer-based.
 *
 * @see https://threejs.org/docs/#api/en/core/Layers
 */
export const RENDER_LAYERS = {
  /** Default layer - all standard scene objects */
  ENVIRONMENT: 0,
  /** Central globe (reserved for future selective rendering) */
  GLOBE: 1,
  /** Particle shards - enables layer-based filtering in backface pass */
  PARTICLES: 2,
  /** Atmospheric effects (reserved for future use) */
  EFFECTS: 3,
} as const;

/**
 * Visual Color Constants
 *
 * Single source of truth for critical scene colors.
 * Tests import these values to validate source code consistency.
 *
 * IMPORTANT: When changing these colors, tests will verify the change
 * is intentional. This prevents accidental black/white screen issues.
 */
export const VISUAL_COLORS = {
  /** Background gradient top color - warm cream (#f5f0e8) */
  BACKGROUND_TOP: '#f5f0e8',
  /** Background gradient mid color - soft ivory (#faf2e6) */
  BACKGROUND_MID: '#faf2e6',
  /** Globe earthy brown tone (used for fallback/references) */
  GLOBE_BROWN: '#8b6f47',
  /** Cloud base colors - soft pink */
  CLOUD_PINK: '#f8b4c4',
  /** Cloud base colors - soft lavender */
  CLOUD_LAVENDER: '#d4c4e8',
} as const;

/**
 * Visual Opacity Constants
 *
 * Single source of truth for critical opacity values.
 * Tests import these to verify visibility requirements.
 *
 * Opacity ranges:
 * - 0.0 = completely invisible (NEVER use for scene objects)
 * - 0.2-0.4 = subtle (clouds, atmosphere overlays)
 * - 0.5-0.9 = visible translucent (glass effects)
 * - 1.0 = fully opaque (globe, solid objects)
 */
export const VISUAL_OPACITY = {
  /** Minimum visible cloud opacity */
  CLOUD_MIN: 0.2,
  /** Maximum cloud opacity (still subtle) */
  CLOUD_MAX: 0.5,
  /** Atmosphere overlay opacity (very subtle) */
  ATMOSPHERE: 0.08,
  /** Frosted glass opacity (highly visible) */
  FROSTED_GLASS: 0.9,
  /** Globe main material (fully opaque) */
  GLOBE: 1.0,
} as const;

// ========================================
// Scene Depth Configuration
// Multi-layer depth system for 3D spatial perception
// Colors and opacities tuned for visibility on warm cream background (#f5f0e8)
// ========================================
export const SCENE_DEPTH = {
  // Atmospheric particle layers (parallax depth)
  // Using darker teal/cyan colors that contrast with warm background
  ATMOSPHERE_LAYERS: {
    NEAR: { z: -15, opacity: 0.5, size: 0.12, count: 150, speed: 1.2, color: '#7ab8c9' },
    MID: { z: -40, opacity: 0.35, size: 0.08, count: 200, speed: 0.7, color: '#9ac4d4' },
    FAR: { z: -80, opacity: 0.2, size: 0.05, count: 300, speed: 0.3, color: '#b8d0dc' },
  },

  // Star field depth layers - brighter for visibility
  STAR_LAYERS: {
    NEAR: { radius: 50, count: 300, size: 0.2, opacity: 0.9 },
    MID: { radius: 100, count: 600, size: 0.12, opacity: 0.7 },
    FAR: { radius: 180, count: 1000, size: 0.06, opacity: 0.4 },
  },

  // Fog depth settings (exponential fog with color shift)
  FOG: {
    NEAR_COLOR: '#f5f0e8', // Warm cream (near)
    FAR_COLOR: '#8ba8b8', // Deeper cool blue-gray (far)
    DENSITY: 0.006,
    NEAR: 10,
    FAR: 200,
  },

  // Distant silhouette layers - darker, more saturated colors for contrast
  SILHOUETTES: {
    LAYER_1: { z: -50, opacity: 0.25, color: '#8a9dad' }, // Dusty blue-gray
    LAYER_2: { z: -100, opacity: 0.18, color: '#7a8d9d' }, // Deeper blue-gray
    LAYER_3: { z: -150, opacity: 0.12, color: '#6a7d8d' }, // Deep slate blue
  },

  // Nebula/cloud depth layers - more clouds, higher opacity
  NEBULA: {
    INNER: { z: -20, opacity: 0.25, scale: 35, count: 12 },
    MID: { z: -50, opacity: 0.18, scale: 70, count: 18 },
    OUTER: { z: -100, opacity: 0.12, scale: 120, count: 25 },
  },

  // Orbital rings - more visible
  RINGS: {
    INNER: { z: -5, radius: 4, opacity: 0.3 },
    MID: { z: -25, radius: 12, opacity: 0.18 },
    OUTER: { z: -60, radius: 25, opacity: 0.1 },
  },

  // Ground plane - more visible
  GROUND: {
    Y: -8,
    OPACITY: 0.08,
    SIZE: 150,
    COLOR: '#c4b8a8', // Warmer tone that still contrasts
  },

  // Vignette - slightly stronger
  VIGNETTE: {
    INTENSITY: 0.5,
    RADIUS: 0.8,
    SOFTNESS: 0.45,
    COLOR: '#2a3a4a', // Dark blue-gray for depth
  },

  // Particle Z-distribution for ParticleSwarm
  PARTICLE_Z: {
    MIN: -8,
    MAX: 4,
    VARIANCE: 0.6,
  },

  // Distant cloud layers (beyond main CloudSystem)
  DISTANT_CLOUDS: {
    LAYER_1: { radius: 20, count: 8, opacity: 0.35, scale: 1.5 },
    LAYER_2: { radius: 30, count: 10, opacity: 0.25, scale: 2.0 },
    LAYER_3: { radius: 45, count: 12, opacity: 0.18, scale: 2.5 },
    LAYER_4: { radius: 65, count: 15, opacity: 0.12, scale: 3.0 },
  },
} as const;
