import type { MoodId } from '../constants';

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
 * Organic & Natural color system with warm-cool balance
 * Background: Dark with purple undertone
 * Temperature: Cool exhale + soft greens → Warm inhale + peach
 * Nature-inspired palette with earthy accents
 */
export const BASE_COLORS = {
  primary: '#7EC8D4', // Soft Cyan (matches 'moment' mood)
  // Warmer backgrounds with organic feel
  background: '#0a0816', // Deep dark base
  backgroundMid: '#161225', // Purple warmth
  backgroundLight: '#241a34', // Light warm option

  // Organic HUD Colors with warm-cool duality
  panelBg: 'rgba(18, 16, 22, 0.45)', // Warmer, more transparent for glassmorphism
  panelBorder: 'rgba(126, 200, 212, 0.08)', // Cool cyan border (barely visible)
  panelBorderWarm: 'rgba(212, 165, 116, 0.08)', // Warm sand border (for left panel)
  textPrimary: '#fffef7', // Warm cream white
  textSecondary: '#b8a896', // Warm taupe (was cool gray)
  textAccent: '#7ec8d4', // Keep cool cyan for breathing accent
  accentWarm: '#d4a574', // Warm sand/clay
  accentEarth: '#7ea888', // Soft sage green
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
export function getMoodColorCounts(moodCounts: Record<MoodId, number>): Record<string, number> {
  const colorCounts: Record<string, number> = {};

  for (const [moodId, count] of Object.entries(moodCounts)) {
    if (count > 0) {
      const color = getMoodColor(moodId as MoodId);
      colorCounts[color] = (colorCounts[color] || 0) + count;
    }
  }

  return colorCounts;
}
