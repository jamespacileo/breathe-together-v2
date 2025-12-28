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
  SPHERE_SCALE_MIN: 0.6,
  SPHERE_SCALE_MAX: 1.4,
  SPHERE_COLOR_EXHALE: '#a8d8e0', // Saturated cool blue (exhale = calm, releasing)
  SPHERE_COLOR_INHALE: '#ffe8c8', // Saturated warm cream (inhale = energizing, receiving)
  SPHERE_OPACITY: 0.15,

  // Particles
  PARTICLE_ORBIT_MIN: 1.5, // Closer to surface on inhale
  PARTICLE_ORBIT_MAX: 3.5,
  PARTICLE_COUNT: 300,
  PARTICLE_SIZE: 0.05,
  PARTICLE_FILLER_COLOR: '#6B8A9C',
  PARTICLE_COLOR_DAMPING: 1.5,

  // Physics Tunables
  PARTICLE_DRAG: 0.8,
  SPRING_STIFFNESS: 5.0,
  JITTER_STRENGTH: 0.1,
  REPULSION_POWER: 2.0,
  REPULSION_STRENGTH: 1.5,

  // Environment - Organic & Natural with atmospheric depth
  AMBIENT_LIGHT_INTENSITY: 0.3,

  // Lighting - Warm-cool balance with organic color journey
  KEY_LIGHT_INTENSITY_MIN: 0.3, // Subtler, less harsh (was 0.4)
  KEY_LIGHT_COLOR: '#e8c4a4', // Warm peach-sand during inhale (was cool cyan)
  FILL_LIGHT_INTENSITY: 0.2,
  FILL_LIGHT_COLOR: '#6ba8a8', // Cool teal-green (was cool blue)
  RIM_LIGHT_INTENSITY: 0.15,
  RIM_LIGHT_COLOR: '#d4e8f0', // Pale cyan
};

/**
 * BreathingSphere Configuration - Grouped by logical category
 * These interfaces define the shape of the sphere's configuration,
 * making it easier to manage presets and understand the component's design.
 */

export interface SphereVisualConfig {
  opacity: number;
  chromaticAberration: number;
  fresnelIntensityBase: number;
  fresnelIntensityRange: number;
}

export interface SphereAnimationConfig {
  entranceDelayMs: number;
  entranceDurationMs: number;
  enableOrganicPulse: boolean;
  organicPulseSpeed: number;
  organicPulseIntensity: number;
}

export interface SphereGeometryConfig {
  mainGeometryDetail: number;
}

export interface SphereLayerConfig {
  coreScale: number;
  coreOpacityBase: number;
  coreOpacityRange: number;
  auraScale: number;
  auraOpacityBase: number;
  auraOpacityRange: number;
}

export interface SphereConfig {
  visuals: SphereVisualConfig;
  animation: SphereAnimationConfig;
  geometry: SphereGeometryConfig;
  layers: SphereLayerConfig;
}

/**
 * Default BreathingSphere configuration - Organic & Natural
 * Enhanced Fresnel glow and warmer core opacity for breathing presence
 */
export const DEFAULT_SPHERE_CONFIG: SphereConfig = {
  visuals: {
    opacity: VISUALS.SPHERE_OPACITY,
    chromaticAberration: 0.02,
    fresnelIntensityBase: 0.5, // Reduced to preserve color saturation (was 0.9)
    fresnelIntensityRange: 0.6, // Reduced to preserve color saturation (was 1.2)
  },
  animation: {
    entranceDelayMs: 200,
    entranceDurationMs: 800,
    enableOrganicPulse: true,
    organicPulseSpeed: 0.5,
    organicPulseIntensity: 0.05,
  },
  geometry: {
    mainGeometryDetail: 2,
  },
  layers: {
    coreScale: 0.4,
    coreOpacityBase: 0.3, // Increased from 0.2 (more visible, inviting)
    coreOpacityRange: 0.5, // Increased from 0.3 (35-80% opacity range, more alive)
    auraScale: 1.5,
    auraOpacityBase: 0.02,
    auraOpacityRange: 0.05,
  },
};

/**
 * Particle Physics Constants
 * Tuning parameters for the particle simulation
 * Extracted from hardcoded values in src/entities/particle/systems.tsx (Dec 2024)
 */
export const PARTICLE_PHYSICS = {
  // Wind / Turbulence
  WIND_BASE_STRENGTH: 0.2, // Base wind effect (dampened by crystallization)
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
