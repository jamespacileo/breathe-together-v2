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
 * Monument Valley Palette - warm gem tones harmonized with globe aesthetic
 * Colors chosen to complement the globe's peachy-coral land and soft teal water
 *
 * Each color maps directly to one mood category (1:1 mapping)
 */
export const MONUMENT_VALLEY_PALETTE = {
  gratitude: '#e9a855', // Warm Amber - like sunlit terracotta, appreciation
  presence: '#5ec4a8', // Soft Seafoam - matches globe's water, calm presence
  release: '#7a9dba', // Slate Blue - dusty sky blue, letting go
  connection: '#de7b6b', // Soft Coral - matches globe's land tones, togetherness
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
