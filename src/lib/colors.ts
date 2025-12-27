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

/**
 * Refined color system with warmth journey
 * Background: Warmer, richer darks with purple undertone
 * Temperature: Cool exhale → Warm inhale
 */
export const BASE_COLORS = {
	primary: '#7EC8D4', // Soft Cyan (matches 'moment' mood)
	// Warmer backgrounds (refined from #0f1723, #1a2634)
	background: '#0a0816', // Was #0f1723 - warmer, richer with purple undertone
	backgroundMid: '#161225', // Was #1a2634 - more purple warmth
	backgroundLight: '#241a34', // Additional warm light option

	// HUD Colors
	panelBg: 'rgba(10, 8, 22, 0.65)', // Warmer dark, slightly less opaque
	panelBorder: 'rgba(126, 200, 212, 0.2)', // Subtler border (was 0.3)
	textPrimary: '#f5f5f7', // Slight warm tint (not pure white)
	textSecondary: '#a8b8c8', // Muted blue-gray
	textAccent: '#7ec8d4', // Cyan accent
};

/**
 * Phase-specific colors for the breathing sphere
 * Refined with temperature journey: Cool exhale → Warm inhale
 */
export const SPHERE_PHASE_COLORS = {
	inhale: { r: 0.49, g: 0.78, b: 0.83 }, // Soft Cyan (#7ec8d4)
	holdIn: { r: 0.55, g: 0.85, b: 0.9 }, // Brighter Cyan (#8dd9e5)
	exhale: { r: 0.4, g: 0.7, b: 0.75 }, // Deeper Cyan (#6ab3c0)
	holdOut: { r: 0.35, g: 0.65, b: 0.7 }, // Muted Cyan (#5aa6b3)
};

/**
 * Temperature color accents for warmth injection during inhale
 * Very subtle overlay to add warmth without being obvious
 */
export const WARMTH_ACCENT = {
	exhale: '#1a4d6d', // Cool deep blue
	inhale: '#9fd9e8', // Warm light cyan with peachy undertone
	warmthOverlay: '#ffd9b3', // Warm peach (opacity: 0.08 for subtlety)
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
