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
 * Avatar IDs - all valid avatars in the application
 */
export const AVATAR_IDS = ['teal', 'lavender', 'amber', 'sage', 'coral', 'indigo'] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

/**
 * Set of valid mood IDs for O(1) lookup validation
 */
export const VALID_MOODS = new Set<string>(MOOD_IDS);

/**
 * Empty moods template - all moods initialized to 0
 */
export const EMPTY_MOODS: Record<MoodId, number> = {
  moment: 0,
  anxious: 0,
  processing: 0,
  preparing: 0,
  grateful: 0,
  celebrating: 0,
  here: 0,
};

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
 * Visual Constants
 */
export const VISUALS = {
  // Sphere - Organic warmth with saturated cool-warm color journey
  SPHERE_SCALE_MIN: 0.3, // Significantly reduced (was 0.6)
  SPHERE_SCALE_MAX: 0.7, // Significantly reduced (was 1.4)
  SPHERE_COLOR_EXHALE: '#4A8A9A', // Meditation teal-blue (deep, saturated)
  SPHERE_COLOR_INHALE: '#D4A574', // Warm amber-sand (meditation gold)
  /** @deprecated Inlined in BreathingSphere for Triplex compatibility. See src/entities/breathingSphere/index.tsx:50 */
  SPHERE_OPACITY: 0.12, // Slightly more ethereal (was 0.15)

  // Particles
  PARTICLE_ORBIT_MIN: 0.8, // Tighter to small sphere surface (was 1.1)
  PARTICLE_ORBIT_MAX: 6.0, // Much wider expansion (was 4.5)
  /** @deprecated Inlined in Particle components for Triplex compatibility. See src/entities/particle/index.tsx:20,119 */
  PARTICLE_COUNT: 300,
  PARTICLE_SIZE: 0.05,
  PARTICLE_FILLER_COLOR: '#6B8A9C',
  PARTICLE_COLOR_DAMPING: 1.5,

  // Physics Tunables (Static - legacy)
  PARTICLE_DRAG: 0.8,
  SPRING_STIFFNESS: 5.0,

  // Reactive Physics (Phase 2 & 3)
  // Inhale: Tight and fast (higher stiffness, lower drag for energy)
  // Exhale: Loose and viscous (lower stiffness, higher drag for relaxation)
  PARTICLE_DRAG_INHALE: 0.7,
  PARTICLE_DRAG_EXHALE: 0.9,
  SPRING_STIFFNESS_INHALE: 12.0, // Snappier gathering (was 8.0)
  SPRING_STIFFNESS_EXHALE: 3.0,

  JITTER_STRENGTH: 0.1,
  REPULSION_POWER: 2.0,
  REPULSION_STRENGTH: 1.5,

  // Environment - Organic & Natural with atmospheric depth
  /** @deprecated Inlined in Lighting for Triplex compatibility. See src/entities/lighting/index.tsx:50 */
  AMBIENT_LIGHT_INTENSITY: 0.15, // Dark meditation space (reduced from 0.45)

  // Lighting - Warm-cool balance with meditation colors
  /** @deprecated Inlined in Lighting for Triplex compatibility. See src/entities/lighting/index.tsx:52 */
  KEY_LIGHT_INTENSITY_MIN: 0.2, // Subtle warm glow (reduced from 0.5)
  /** @deprecated Inlined in Lighting for Triplex compatibility. See src/entities/lighting/index.tsx:53 */
  KEY_LIGHT_COLOR: '#E89C5C', // Warm amber/orange (changed from #f0d8c0)
  FILL_LIGHT_INTENSITY: 0.12, // Very subtle cool fill (reduced from 0.3)
  FILL_LIGHT_COLOR: '#4A7B8A', // Deep teal-blue (changed from #8ababa)
  RIM_LIGHT_INTENSITY: 0.08, // Very subtle rim (reduced from 0.2)
  RIM_LIGHT_COLOR: '#6BA8B5', // Medium cyan-blue (changed from #e0f0f8)
};

/**
 * BreathingSphere Configuration - Internal constants only
 * @deprecated - BreathingSphere now uses direct prop values for all user-facing configuration
 * These constants are retained only for internal animation defaults
 */

export const SPHERE_ANIMATION_DEFAULTS = {
  entranceDelayMs: 200,
  entranceDurationMs: 800,
} as const;

export const SPHERE_LAYER_SCALE = {
  core: 0.4,
  aura: 1.5,
} as const;

export const SPHERE_VISUAL_DEFAULTS = {
  fresnelIntensityBase: 0.5, // Fixed glow base
  fresnelIntensityRange: 0.6, // Fixed glow range
  chromaticAberration: 0.02, // Fixed core effect
} as const;

/**
 * Particle Physics Constants
 * Tuning parameters for the particle simulation
 * Extracted from hardcoded values in src/entities/particle/systems.tsx (Dec 2024)
 */
export const PARTICLE_PHYSICS = {
  // Wind / Turbulence
  WIND_BASE_STRENGTH: 0.45, // Stronger wind feel (was 0.2)
  WIND_FREQUENCY_SCALE: 0.5, // Frequency multiplier for Simplex noise
  WIND_TIME_SCALE: 0.2, // Time scale for wind animation

  // Wind noise offsets (to decorrelate X/Y/Z axes)
  WIND_NOISE_OFFSET_X: 100,
  WIND_NOISE_OFFSET_Y: 200,
  WIND_NOISE_OFFSET_Z: 0, // Z uses the base s value

  // Jitter / Shiver (high-frequency vibration during holds)
  JITTER_FREQUENCY_X: 60, // Sin() frequency for X jitter
  JITTER_FREQUENCY_Y: 61, // Sin() frequency for Y jitter
  JITTER_FREQUENCY_Z: 59, // Sin() frequency for Z jitter (prime to avoid alignment)

  // Jitter phase offsets (to decorrelate axes)
  JITTER_PHASE_OFFSET_Y: 10,
  JITTER_PHASE_OFFSET_Z: 20,

  // Sphere Repulsion
  REPULSION_RADIUS_OFFSET: 0.4, // Additional radius beyond sphere scale for repulsion boundary
  REPULSION_STRENGTH_MULTIPLIER: 20, // Overall strength multiplier for repulsion force

  // Noise threshold (avoid computing forces below this strength)
  FORCE_THRESHOLD: 0.001,
} as const;
