import type { MoodId } from '../constants';

/**
 * Color palettes and mood configurations
 *
 * Refined warm palette with cohesive harmony:
 * - gratitude (champagne gold) - Appreciating this moment
 * - presence (sage) - Simply being here (covers calm, curiosity, rest)
 * - release (dusty blue) - Letting go
 * - connection (soft coral) - Here with others
 *
 * All colors share warm undertones for visual cohesion while
 * maintaining distinct mood identities.
 */

/**
 * Ethereal Warm Palette - harmonious gem colors for icosahedral shards
 *
 * Design principles:
 * - All colors share warm undertones (shifted toward gold/peach)
 * - Reduced saturation for ethereal, meditative quality
 * - Still distinct enough to convey mood meaning
 * - Works beautifully together in any combination
 */
export const MONUMENT_VALLEY_PALETTE = {
  gratitude: '#e8c170', // Soft champagne gold - warm, appreciative
  presence: '#9ec4a8', // Muted sage green - calm, grounded
  release: '#a8b8c8', // Dusty blue-gray - soft, releasing
  connection: '#e8a890', // Soft coral peach - warm, connected
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
