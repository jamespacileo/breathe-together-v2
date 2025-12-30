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
 * Monument Valley Palette - simplified 4-mood aesthetic
 * Matches the HTML artifact color scheme
 */
export const MONUMENT_VALLEY_PALETTE = {
  joy: '#ffbe0b', // Yellow (bright, energetic)
  peace: '#06d6a0', // Teal (calm, flowing)
  solitude: '#118ab2', // Sky blue (introspective)
  love: '#ef476f', // Rose pink (warm, connective)
} as const;

/**
 * Map existing 7 moods to 4 Monument Valley colors
 * Maintains backward compatibility while shifting aesthetic
 */
export function getMonumentValleyMoodColor(moodId: MoodId | '' | undefined): string {
  if (!moodId) return MONUMENT_VALLEY_PALETTE.peace;

  const mapping: Record<MoodId, string> = {
    // Joy cluster - energetic, celebratory
    grateful: MONUMENT_VALLEY_PALETTE.joy,
    celebrating: MONUMENT_VALLEY_PALETTE.joy,

    // Peace cluster - present, grounded
    moment: MONUMENT_VALLEY_PALETTE.peace,
    here: MONUMENT_VALLEY_PALETTE.peace,

    // Solitude cluster - introspective, processing
    anxious: MONUMENT_VALLEY_PALETTE.solitude,
    processing: MONUMENT_VALLEY_PALETTE.solitude,

    // Love cluster - connecting, preparing
    preparing: MONUMENT_VALLEY_PALETTE.love,
  };

  return mapping[moodId as MoodId] ?? MONUMENT_VALLEY_PALETTE.peace;
}

/**
 * Get mood color by mood ID
 */
export function getMoodColor(moodId: MoodId | '' | undefined): string {
  if (!moodId) return BASE_COLORS.primary;
  const mood = MOOD_METADATA[moodId as MoodId];
  return mood?.color ?? BASE_COLORS.primary;
}
