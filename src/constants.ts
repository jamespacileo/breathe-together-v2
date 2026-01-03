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
 * Keplerian Physics Constants
 *
 * Implements simplified Kepler's Laws for natural particle motion:
 * Orbital velocity v = √(GM/r) - velocity inversely proportional to √radius
 *
 * During inhale (smaller radius): particles speed up (tightening effect)
 * During exhale (larger radius): particles slow down (releasing effect)
 *
 * The "apparent mass" modulates with breath for dynamic gravitational pull:
 * - Higher during inhale: globe "pulls" particles inward more strongly
 * - Lower during exhale: weaker pull allows natural expansion
 */
export const KEPLERIAN_PHYSICS = {
  /**
   * Base gravitational parameter (GM combined)
   * Higher = faster base orbital velocity
   * Tuned for aesthetic orbital drift at reference radius
   */
  BASE_GM: 0.3,

  /**
   * Reference radius for velocity normalization
   * At this radius, orbital speed matches the original ORBIT_BASE_SPEED
   * Uses baseRadius (4.5) as the equilibrium point
   */
  REFERENCE_RADIUS: 4.5,

  /**
   * Breath modulation amplitude for apparent mass
   * 0 = no breath effect on mass, 1 = full modulation
   * During inhale: mass increases by this factor (stronger pull)
   * During exhale: mass decreases by this factor (weaker pull)
   */
  BREATH_MASS_MODULATION: 0.3,

  /**
   * Minimum velocity multiplier (prevents near-zero speed at large radii)
   * Ensures particles always have some orbital motion
   */
  MIN_VELOCITY_FACTOR: 0.5,

  /**
   * Maximum velocity multiplier (caps speed at small radii)
   * Prevents particles from appearing to "zip" around too fast
   */
  MAX_VELOCITY_FACTOR: 2.0,
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
