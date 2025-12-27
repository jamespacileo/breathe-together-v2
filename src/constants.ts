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
 * Breathing Cycle Constants (Box Breathing)
 */
export const BREATH_PHASE_DURATION = 4; // seconds
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
	PARTICLE_ORBIT_MIN: 1.8,
	PARTICLE_ORBIT_MAX: 3.5,
	PARTICLE_COUNT: 300,
	PARTICLE_SIZE: 0.05,
	PARTICLE_FILLER_COLOR: '#6B8A9C',

	// Environment
	BG_COLOR: '#050514',
	AMBIENT_LIGHT_INTENSITY: 0.5,
};
