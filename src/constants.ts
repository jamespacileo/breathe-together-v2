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
 * Matches reference: baseRadius=4.5, expansion=2.0, core=2.4
 */
export const VISUALS = {
  // Sphere scale during breathing animation (subtle pulse like reference: 1 + breath * 0.04)
  SPHERE_SCALE_MIN: 1.0,
  SPHERE_SCALE_MAX: 1.04,

  // Particle orbit radius during breathing animation
  // Reference: baseRadius (4.5) to baseRadius + expansion (6.5)
  PARTICLE_ORBIT_MIN: 4.5,
  PARTICLE_ORBIT_MAX: 6.5,
} as const;
