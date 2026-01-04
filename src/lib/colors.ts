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
 * Kurzgesagt-Inspired Cosmic Palette - vibrant colors for crystal shards
 *
 * Designed for maximum visibility against dark cosmic backgrounds.
 * Based on Kurzgesagt/In a Nutshell visual style:
 * - High saturation (>0.5) for pop
 * - Warm coral, electric teal, sunny gold, soft pink tones
 * - Sufficient luminance for glass refraction effect
 *
 * Each color maps directly to one mood category (1:1 mapping)
 */
export const MONUMENT_VALLEY_PALETTE = {
  gratitude: '#FFAB40', // Warm Amber - appreciation, golden warmth (sat=1.0, lum=0.52)
  presence: '#4DD0E1', // Electric Cyan - being here, vibrant clarity (sat=0.71, lum=0.52)
  release: '#64FFDA', // Mint Green - letting go, fresh energy (sat=1.0, lum=0.79)
  connection: '#FF4081', // Vibrant Pink - love, passionate warmth (sat=1.0, lum=0.28)
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
