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
 * Simplified (Dec 2024): Removed SPHERE_SCALE_* (sphereScale trait was never used)
 * Only orbit radius values remain (used by ParticleSwarm).
 */
export const VISUALS = {
  /** Min orbit radius (inhale - particles closest to globe) */
  PARTICLE_ORBIT_MIN: 0.75,
  /** Max orbit radius (exhale - particles farthest from globe) */
  PARTICLE_ORBIT_MAX: 6.0,
} as const;
