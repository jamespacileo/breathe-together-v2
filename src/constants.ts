/**
 * Shared constants used across frontend and worker
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
export const AVATAR_IDS = [
	'teal',
	'lavender',
	'amber',
	'sage',
	'coral',
	'indigo',
] as const;

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
	// Sphere
	SPHERE_SCALE_MIN: 0.6,
	SPHERE_SCALE_MAX: 1.4,
	SPHERE_COLOR_EXHALE: '#1a4d6d',
	SPHERE_COLOR_INHALE: '#4dd9e8',
	SPHERE_OPACITY: 0.15,
	SPHERE_SEGMENTS: 64,

	// Particles
	PARTICLE_ORBIT_MIN: 1.5,  // Closer to surface on inhale
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

	// Environment - Refined with warmer, richer tones
	BG_COLOR: '#0a0816', // Was #050514 - warmer with purple undertone
	AMBIENT_LIGHT_INTENSITY: 0.3, // Was 0.5 - reduced for layered lighting

	// Lighting - Layered directional lights (key + fill + rim)
	KEY_LIGHT_INTENSITY_MIN: 0.4,
	KEY_LIGHT_INTENSITY_MAX: 0.7, // Modulates with breath phase
	KEY_LIGHT_COLOR: '#9fd9e8', // Warm cyan
	FILL_LIGHT_INTENSITY: 0.2,
	FILL_LIGHT_COLOR: '#4a5d7e', // Cool blue
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
	segments: number;
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
 * Default BreathingSphere configuration (balanced quality)
 */
export const DEFAULT_SPHERE_CONFIG: SphereConfig = {
	visuals: {
		opacity: VISUALS.SPHERE_OPACITY,
		chromaticAberration: 0.02,
		fresnelIntensityBase: 0.6,
		fresnelIntensityRange: 0.8,
	},
	animation: {
		entranceDelayMs: 200,
		entranceDurationMs: 800,
		enableOrganicPulse: true,
		organicPulseSpeed: 0.5,
		organicPulseIntensity: 0.05,
	},
	geometry: {
		segments: 64,
		mainGeometryDetail: 32,
	},
	layers: {
		coreScale: 0.4,
		coreOpacityBase: 0.2,
		coreOpacityRange: 0.3,
		auraScale: 1.5,
		auraOpacityBase: 0.02,
		auraOpacityRange: 0.05,
	},
};

/**
 * High-quality BreathingSphere configuration (best visuals, higher perf cost)
 */
export const HIGH_QUALITY_SPHERE_CONFIG: SphereConfig = {
	visuals: {
		opacity: 0.2,
		chromaticAberration: 0.04,
		fresnelIntensityBase: 0.8,
		fresnelIntensityRange: 1.0,
	},
	animation: {
		entranceDelayMs: 300,
		entranceDurationMs: 1000,
		enableOrganicPulse: true,
		organicPulseSpeed: 0.6,
		organicPulseIntensity: 0.1,
	},
	geometry: {
		segments: 128,
		mainGeometryDetail: 64,
	},
	layers: {
		coreScale: 0.5,
		coreOpacityBase: 0.3,
		coreOpacityRange: 0.4,
		auraScale: 2.0,
		auraOpacityBase: 0.05,
		auraOpacityRange: 0.1,
	},
};

/**
 * Low-quality BreathingSphere configuration (performance optimized)
 */
export const LOW_QUALITY_SPHERE_CONFIG: SphereConfig = {
	visuals: {
		opacity: 0.1,
		chromaticAberration: 0.01,
		fresnelIntensityBase: 0.5,
		fresnelIntensityRange: 0.6,
	},
	animation: {
		entranceDelayMs: 100,
		entranceDurationMs: 600,
		enableOrganicPulse: false,
		organicPulseSpeed: 0.5,
		organicPulseIntensity: 0.02,
	},
	geometry: {
		segments: 32,
		mainGeometryDetail: 16,
	},
	layers: {
		coreScale: 0.3,
		coreOpacityBase: 0.15,
		coreOpacityRange: 0.2,
		auraScale: 1.2,
		auraOpacityBase: 0.01,
		auraOpacityRange: 0.02,
	},
};

/**
 * Lighting Configuration - Grouped by light source
 * Simplifies managing complex lighting setups and allows easy preset swapping
 */

export interface LightSourceConfig {
	position: [number, number, number];
	intensity: number;
	color: string;
}

export interface LightingConfig {
	ambient: {
		intensity: number;
		color: string;
	};
	key: LightSourceConfig;
	fill: LightSourceConfig;
	rim: LightSourceConfig;
}

/**
 * Default Lighting configuration (balanced)
 */
export const DEFAULT_LIGHTING_CONFIG: LightingConfig = {
	ambient: {
		intensity: VISUALS.AMBIENT_LIGHT_INTENSITY,
		color: '#a8b8d0',
	},
	key: {
		position: [2, 3, 5],
		intensity: VISUALS.KEY_LIGHT_INTENSITY_MIN,
		color: VISUALS.KEY_LIGHT_COLOR,
	},
	fill: {
		position: [-2, -1, -3],
		intensity: VISUALS.FILL_LIGHT_INTENSITY,
		color: VISUALS.FILL_LIGHT_COLOR,
	},
	rim: {
		position: [0, -5, -5],
		intensity: VISUALS.RIM_LIGHT_INTENSITY,
		color: VISUALS.RIM_LIGHT_COLOR,
	},
};

/**
 * Dramatic Lighting configuration (high contrast)
 */
export const DRAMATIC_LIGHTING_CONFIG: LightingConfig = {
	ambient: {
		intensity: 0.15,
		color: '#4a5d7e',
	},
	key: {
		position: [3, 4, 6],
		intensity: 1.2,
		color: '#7ec8d4',
	},
	fill: {
		position: [-3, -2, -4],
		intensity: 0.3,
		color: '#4a5d7e',
	},
	rim: {
		position: [0, -5, -5],
		intensity: 0.25,
		color: '#d4e8f0',
	},
};

/**
 * Soft Lighting configuration (gentle, diffused)
 */
export const SOFT_LIGHTING_CONFIG: LightingConfig = {
	ambient: {
		intensity: 0.5,
		color: '#c8d8e8',
	},
	key: {
		position: [1, 2, 3],
		intensity: 0.5,
		color: '#a8c8d8',
	},
	fill: {
		position: [-1, -1, -2],
		intensity: 0.4,
		color: '#8a9dae',
	},
	rim: {
		position: [0, -4, -4],
		intensity: 0.1,
		color: '#d4e8f0',
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

/**
 * Quality presets for adaptive rendering
 * Maps quality levels to particle counts and visual settings
 */
export const QUALITY_PRESETS = {
	low: {
		particleCount: 100,
		sphereSegments: 32,
		description: 'Low: ~100 particles, minimal effects',
	},
	medium: {
		particleCount: 200,
		sphereSegments: 64,
		description: 'Medium: ~200 particles, full effects',
	},
	high: {
		particleCount: 300,
		sphereSegments: 128,
		description: 'High: ~300 particles, enhanced effects',
	},
} as const;

export type QualityLevel = keyof typeof QUALITY_PRESETS;
