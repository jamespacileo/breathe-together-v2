/**
 * Shared constants used across the frontend
 * Single source of truth for mood and avatar IDs
 */

/**
 * Mood IDs - all valid moods in the application
 */
export const MOOD_IDS = [
  'moment',
  'anxious',
  'processing',
  'preparing',
  'grateful',
  'celebrating',
  'here',
] as const;

export type MoodId = (typeof MOOD_IDS)[number];

/**
 * Breathing Cycle Configuration
 *
 * Box breathing pattern - equal duration for all phases.
 * Total cycle = INHALE + HOLD_IN + EXHALE + HOLD_OUT
 *
 * To customize timing, simply change these values.
 * All derived calculations (orbit radius, animations) adapt automatically.
 */
export const BREATH_PHASES = {
  INHALE: 4,
  HOLD_IN: 4,
  EXHALE: 4,
  HOLD_OUT: 4,
} as const;

/** Total breathing cycle duration (derived from phase durations) */
export const BREATH_TOTAL_CYCLE =
  BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN + BREATH_PHASES.EXHALE + BREATH_PHASES.HOLD_OUT;

/**
 * Visual Constants - Breathing animation parameters
 *
 * Simplified (Dec 2024): Removed SPHERE_SCALE_* (sphereScale trait was never used)
 * Only orbit radius values remain (used by ParticleSwarm).
 */
export const VISUALS = {
  /** Min orbit radius (inhale - particles closest to globe) */
  PARTICLE_ORBIT_MIN: 0.75,
  /** Max orbit radius (exhale - particles farthest from globe) */
  PARTICLE_ORBIT_MAX: 6.0,
} as const;
