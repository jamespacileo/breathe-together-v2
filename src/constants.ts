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
 * Breathing Cycle Constants (Asymmetric for natural feel)
 * Total cycle remains 16 seconds for global sync
 */
export const BREATH_PHASES = {
  INHALE: 3,
  HOLD_IN: 5,
  EXHALE: 5,
  HOLD_OUT: 3,
} as const;

export const BREATH_TOTAL_CYCLE = 16; // seconds

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
