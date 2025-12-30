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
 * Only includes values actually used in breath calculations
 */
export const VISUALS = {
  // Sphere scale during breathing animation
  SPHERE_SCALE_MIN: 0.3,
  SPHERE_SCALE_MAX: 0.7,

  // Particle orbit radius during breathing animation
  PARTICLE_ORBIT_MIN: 0.75,
  PARTICLE_ORBIT_MAX: 6.0,
} as const;
