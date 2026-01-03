/**
 * Shared constants used across the frontend
 * Single source of truth for mood and avatar IDs
 */

import { DERIVED_CONSTANTS, KEPLERIAN_CONFIG } from './config/particlePhysics';

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
 * Values are derived from centralized particle physics config.
 * See src/config/particlePhysics.ts for the source of truth.
 *
 * Orbit distances are calculated relative to globe radius:
 * - MIN = globeRadius × (1 + inhaleRatio) = 1.5 × 1.5 = 2.25
 * - MAX = globeRadius × (1 + exhaleRatio) = 1.5 × 4.0 = 6.0
 */
export const VISUALS = {
  /** Min orbit radius (inhale - particles closest to globe)
   * = globe radius + 0.5 × globe radius (half globe radius from surface) */
  PARTICLE_ORBIT_MIN: DERIVED_CONSTANTS.PARTICLE_ORBIT_MIN,
  /** Max orbit radius (exhale - particles farthest from globe) */
  PARTICLE_ORBIT_MAX: DERIVED_CONSTANTS.PARTICLE_ORBIT_MAX,
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
 * Re-exported from centralized config for backwards compatibility.
 * See src/config/particlePhysics.ts for the source of truth.
 *
 * Implements simplified Kepler's Laws for natural particle motion:
 * Orbital velocity v = √(GM/r) - velocity inversely proportional to √radius
 */
export const KEPLERIAN_PHYSICS = {
  BASE_GM: KEPLERIAN_CONFIG.BASE_GM,
  REFERENCE_RADIUS: KEPLERIAN_CONFIG.REFERENCE_RADIUS,
  BREATH_MASS_MODULATION: KEPLERIAN_CONFIG.BREATH_MASS_MODULATION,
  MIN_VELOCITY_FACTOR: KEPLERIAN_CONFIG.MIN_VELOCITY_FACTOR,
  MAX_VELOCITY_FACTOR: KEPLERIAN_CONFIG.MAX_VELOCITY_FACTOR,
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
