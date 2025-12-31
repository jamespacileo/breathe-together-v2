import type { MoodId } from '../constants';

/**
 * Color palettes and mood configurations
 *
 * Simplified 4-category mood system with positive framing:
 * - gratitude (gold) - Appreciating this moment
 * - stillness (teal) - Finding center
 * - release (blue) - Letting go
 * - connection (rose) - Here with others
 */

/**
 * Monument Valley Palette - saturated colors for frosted ceramic shards
 * These colors are tinted through the refraction shader for the illustrative look
 *
 * Each color maps directly to one mood category (1:1 mapping)
 */
export const MONUMENT_VALLEY_PALETTE = {
  gratitude: '#ffbe0b', // Warm Gold - appreciation, thankfulness
  stillness: '#06d6a0', // Teal/Mint - calm, centered, grounded
  release: '#118ab2', // Deep Blue - letting go, processing
  connection: '#ef476f', // Warm Rose - love, community, togetherness
} as const;

/**
 * Get the color for a mood ID
 * Direct 1:1 mapping - each mood has exactly one color
 */
export function getMonumentValleyMoodColor(moodId: MoodId | '' | undefined): string {
  if (!moodId) return MONUMENT_VALLEY_PALETTE.stillness;
  return MONUMENT_VALLEY_PALETTE[moodId] ?? MONUMENT_VALLEY_PALETTE.stillness;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use MONUMENT_VALLEY_PALETTE directly
 */
export const MOOD_COLORS = MONUMENT_VALLEY_PALETTE;
