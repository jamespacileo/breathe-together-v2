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
