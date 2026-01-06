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
 * Monument Valley Palette - vibrant gem colors that read clearly in UI + scene
 * Tuned for distinct mood recognition while staying cohesive with the sky gradient.
 *
 * Each color maps directly to one mood category (1:1 mapping)
 */
export const MONUMENT_VALLEY_PALETTE = {
  gratitude: '#ffbe0b', // Warm gold
  presence: '#06d6a0', // Teal/mint
  release: '#118ab2', // Deep blue
  connection: '#ef476f', // Rose
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
 * Neon-saturated mood colors for vibrant shard inner glow
 * Used in RefractionPipeline for vivid mood-colored accents on glass shards
 */
export const NEON_MOOD_PALETTE = {
  gratitude: '#ffbe0b', // Warm gold
  presence: '#06d6a0', // Teal/mint
  release: '#118ab2', // Deep blue
  connection: '#ef476f', // Rose
} as const;

/**
 * Legacy export for backward compatibility
 * @deprecated Use MONUMENT_VALLEY_PALETTE directly
 */
export const MOOD_COLORS = MONUMENT_VALLEY_PALETTE;

/**
 * Alias for test compatibility
 */
export const getMoodColor = getMonumentValleyMoodColor;

/**
 * Get accent color for current mood (for UI elements)
 * Uses neon palette for vibrant UI accents
 *
 * @param mood - Current mood selection (null defaults to presence teal)
 * @returns Hex color string for the mood's accent color
 */
export function getMoodAccentColor(mood: MoodId | null): string {
  if (!mood) return NEON_MOOD_PALETTE.presence; // Default to teal
  return NEON_MOOD_PALETTE[mood];
}

/**
 * Get accent glow color (50% opacity) for current mood
 * Used for shadows, highlights, and glow effects
 *
 * @param mood - Current mood selection (null defaults to presence teal)
 * @returns RGBA color string with 0.5 opacity
 */
export function getMoodAccentGlow(mood: MoodId | null): string {
  const accent = getMoodAccentColor(mood);
  // Convert hex to rgba with 0.5 opacity
  const r = Number.parseInt(accent.slice(1, 3), 16);
  const g = Number.parseInt(accent.slice(3, 5), 16);
  const b = Number.parseInt(accent.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.5)`;
}
