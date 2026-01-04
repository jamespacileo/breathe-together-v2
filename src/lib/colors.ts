import type { MoodId } from '../constants';

/**
 * Color palettes and mood configurations
 *
 * Simplified 4-category mood system with positive framing:
 * - gratitude (warm amber) - Appreciating this moment
 * - presence (cosmic teal) - Simply being here (covers calm, curiosity, rest)
 * - release (stellar blue) - Letting go
 * - connection (nebula pink) - Here with others
 */

/**
 * Cosmic Nebula Palette - calming space colors for meditation
 *
 * Lightened 20-30% for better visibility against dark cosmic backgrounds
 * and softer, more meditative aesthetic.
 *
 * Inspired by:
 * - Real nebulae (Eagle, Helix, Orion)
 * - IMMUNE book cover vibrant palette (softened for calm)
 * - Meditation app color research (2025)
 *
 * Color properties:
 * - Luminance: 0.40-0.60 (visible yet calming)
 * - Contrast: 4:1 to 8:1 against dark space backgrounds
 * - Saturation: Moderate (pastel-like, not oversaturated)
 *
 * These colors are processed through holographic shader for ethereal look.
 * Each color maps directly to one mood category (1:1 mapping).
 */
export const COSMIC_NEBULA_PALETTE = {
  gratitude: '#F0B892', // Soft Peach - warm appreciation (IMMUNE pink+orange softened)
  presence: '#7DE5E5', // Soft Aqua - calm presence (IMMUNE teal softened)
  release: '#8AB3E6', // Soft Periwinkle - letting go (IMMUNE blue softened)
  connection: '#E89CC9', // Soft Rose - togetherness (IMMUNE magenta softened)
} as const;

/**
 * Monument Valley Palette - vibrant gem colors for icosahedral shards
 * @deprecated Use COSMIC_NEBULA_PALETTE for the galaxy scene theme
 *
 * These colors are processed through the gem shader for the illustrative look
 * Each color maps directly to one mood category (1:1 mapping)
 */
export const MONUMENT_VALLEY_PALETTE = {
  gratitude: '#ffbe0b', // Warm Gold - appreciation, thankfulness
  presence: '#06d6a0', // Teal/Mint - being here, calm, curiosity, rest
  release: '#118ab2', // Deep Blue - letting go, processing
  connection: '#ef476f', // Warm Rose - love, community, togetherness
} as const;

/**
 * Active palette - switch between Monument Valley and Cosmic Nebula themes
 */
export const ACTIVE_PALETTE = COSMIC_NEBULA_PALETTE;

/**
 * Get the color for a mood ID using the active palette
 * Direct 1:1 mapping - each mood has exactly one color
 */
export function getMoodColor(moodId: MoodId | '' | undefined): string {
  if (!moodId) return ACTIVE_PALETTE.presence;
  return ACTIVE_PALETTE[moodId] ?? ACTIVE_PALETTE.presence;
}

/**
 * @deprecated Use getMoodColor() instead
 */
export function getMonumentValleyMoodColor(moodId: MoodId | '' | undefined): string {
  return getMoodColor(moodId);
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use ACTIVE_PALETTE directly
 */
export const MOOD_COLORS = ACTIVE_PALETTE;
