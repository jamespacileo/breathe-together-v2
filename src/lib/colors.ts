import type { MoodId } from '../constants';

/**
 * Color palettes and mood configurations
 *
 * Simplified 4-category mood system with positive framing:
 * - gratitude (gold) - Appreciating this moment
 * - presence (teal) - Simply being here (covers calm, curiosity, rest)
 * - release (blue) - Letting go
 * - connection (rose) - Here with others
 */

/**
 * Monument Valley Palette - extremely muted atmospheric colors for transparent gem shards
 * Desaturated by 65-70% in HSL space for misty, atmospheric night sky integration
 * Colors act as subtle tints through transparent glass (alpha 0.15-0.45)
 *
 * HSL desaturation approach ensures proper color grading vs RGB multiplication
 * Each color maps directly to one mood category (1:1 mapping)
 */
export const MONUMENT_VALLEY_PALETTE = {
  gratitude: '#c7c5ad', // Misty beige-gold - appreciation (HSL: 55°, 20%, 73%)
  presence: '#a3bab8', // Pale aqua-gray - being here (HSL: 175°, 15%, 68%)
  release: '#9badb5', // Soft blue-gray - letting go (HSL: 200°, 18%, 66%)
  connection: '#c0abb4', // Dusty mauve-gray - connection (HSL: 330°, 18%, 71%)
} as const;

/**
 * Get the color for a mood ID
 * Direct 1:1 mapping - each mood has exactly one color
 */
export function getMonumentValleyMoodColor(moodId: MoodId | '' | undefined): string {
  if (!moodId) return MONUMENT_VALLEY_PALETTE.presence;
  return MONUMENT_VALLEY_PALETTE[moodId] ?? MONUMENT_VALLEY_PALETTE.presence;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use MONUMENT_VALLEY_PALETTE directly
 */
export const MOOD_COLORS = MONUMENT_VALLEY_PALETTE;

/**
 * Alias for test compatibility
 */
export const getMoodColor = getMonumentValleyMoodColor;
