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
  SPHERE_COLOR_EXHALE: '#b8e2e8', // Softer, lighter cool blue (was #a8d8e0)
  SPHERE_COLOR_INHALE: '#ffe0b0', // Deeper pastel warm cream (was #fff0db)
  SPHERE_OPACITY: 0.12, // Slightly more ethereal (was 0.15)

  // Particles
  PARTICLE_ORBIT_MIN: 0.8, // Tighter to small sphere surface (was 1.1)
  PARTICLE_ORBIT_MAX: 6.0, // Much wider expansion (was 4.5)
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
  AMBIENT_LIGHT_INTENSITY: 0.45, // More grounded, less harsh contrast (was 0.3)

  // Lighting - Warm-cool balance with organic color journey
  KEY_LIGHT_INTENSITY_MIN: 0.5, // Doubled from 0.25 for better visibility (was 0.3 originally)
  KEY_LIGHT_COLOR: '#f0d8c0', // Softer peach-sand (was #e8c4a4)
  FILL_LIGHT_INTENSITY: 0.3, // Doubled from 0.15 for better visibility (was 0.2 originally)
  FILL_LIGHT_COLOR: '#8ababa', // Slightly more muted teal (was #6ba8a8)
  RIM_LIGHT_INTENSITY: 0.2, // Doubled from 0.1 for better visibility (was 0.15 originally)
  RIM_LIGHT_COLOR: '#e0f0f8', // Even paler cyan (was #d4e8f0)
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
