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
 * Cosmic Meditation Palette - ethereal colors for icosahedral crystal shards
 * Semi-transparent glass crystals with soft cosmic glow
 *
 * Each color maps directly to one mood category (1:1 mapping)
 * Colors are desaturated and luminous for cosmic/glass aesthetic
 */
export const MONUMENT_VALLEY_PALETTE = {
  gratitude: '#c4a6ff', // Soft Lavender - appreciation, ethereal warmth
  presence: '#88c8e8', // Celestial Blue - being here, calm clarity
  release: '#a8d4c8', // Nebula Mint - letting go, cosmic freshness
  connection: '#e8b4c8', // Starlight Rose - love, gentle cosmic warmth
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
