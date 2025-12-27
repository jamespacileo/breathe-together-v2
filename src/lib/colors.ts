import type { MoodId } from './simulationConfig';

/**
 * Color palettes and mood configurations
 */

export interface MoodConfig {
	id: MoodId;
	label: string;
	hasDetail: boolean;
	color: string;
	secondaryColor?: string;
}

/**
 * Single source of truth for mood metadata, combining labels, colors, and UI logic.
 */
export const MOOD_METADATA: Record<MoodId, MoodConfig> = {
	moment: {
		id: 'moment',
		label: 'Taking a moment',
		hasDetail: false,
		color: '#7EC8D4', // Soft Cyan - present, grounded
		secondaryColor: '#5A9BAA',
	},
	anxious: {
		id: 'anxious',
		label: 'Anxious about...',
		hasDetail: true,
		color: '#9B8EC8', // Lavender - releasing tension
		secondaryColor: '#7E7EC1',
	},
	processing: {
		id: 'processing',
		label: 'Processing...',
		hasDetail: true,
		color: '#6BB8C0', // Soft Teal - working through
		secondaryColor: '#5A9BAA',
	},
	preparing: {
		id: 'preparing',
		label: 'Preparing for...',
		hasDetail: true,
		color: '#8AB4D6', // Sky Blue - getting ready
		secondaryColor: '#5A9BAA',
	},
	grateful: {
		id: 'grateful',
		label: 'Grateful for...',
		hasDetail: true,
		color: '#C8B87E', // Soft Gold - appreciation
		secondaryColor: '#AA8A5A',
	},
	celebrating: {
		id: 'celebrating',
		label: 'Celebrating...',
		hasDetail: true,
		color: '#C8B87E', // Soft Gold - alias to grateful
		secondaryColor: '#AA8A5A',
	},
	here: {
		id: 'here',
		label: 'Just here',
		hasDetail: false,
		color: '#7EC8D4',
		secondaryColor: '#5A9BAA',
	},
};

export const MOODS: MoodConfig[] = Object.values(MOOD_METADATA);

export function getMoodGradient(moodId: MoodId): string {
	const mood = MOOD_METADATA[moodId] || MOOD_METADATA.moment;
	return `linear-gradient(135deg, ${mood.color}, ${mood.secondaryColor || mood.color})`;
}

export const BASE_COLORS = {
	primary: '#7EC8D4', // Soft Cyan (matches 'moment' mood)
	background: '#0f1723',
	backgroundMid: '#1a2634',
};

/**
 * Phase-specific colors for the breathing sphere
 */
export const SPHERE_PHASE_COLORS = {
	inhale: { r: 0.49, g: 0.78, b: 0.83 }, // Soft Cyan
	holdIn: { r: 0.55, g: 0.85, b: 0.9 }, // Brighter Cyan
	exhale: { r: 0.4, g: 0.7, b: 0.75 }, // Deeper Cyan
	holdOut: { r: 0.35, g: 0.65, b: 0.7 }, // Muted Cyan
};

/**
 * Get mood color by mood ID
 */
export function getMoodColor(moodId: MoodId | '' | undefined): string {
	if (!moodId) return BASE_COLORS.primary;
	const mood = MOOD_METADATA[moodId as MoodId];
	return mood?.color ?? BASE_COLORS.primary;
}

/**
 * Convert mood counts to color counts for particle rendering
 * @param moodCounts - Record of mood IDs to user counts
 * @returns Record of hex colors to user counts
 */
export function getMoodColorCounts(
	moodCounts: Record<MoodId, number>,
): Record<string, number> {
	const colorCounts: Record<string, number> = {};

	for (const [moodId, count] of Object.entries(moodCounts)) {
		if (count > 0) {
			const color = getMoodColor(moodId as MoodId);
			colorCounts[color] = (colorCounts[color] || 0) + count;
		}
	}

	return colorCounts;
}
