import { GALAXY_PALETTE, SHARD_COLORS } from '../config/galaxyPalette';
import type { MoodId } from '../constants';

/**
 * Color palettes and mood configurations - Kurzgesagt Theme
 *
 * Inspired by the Kurzgesagt "Immune" book cover aesthetic:
 * - Deep purple/navy space backgrounds
 * - Vibrant, highly saturated accent colors
 * - Golden yellow as prominent highlight
 * - Rainbow of cell-like particle colors
 *
 * Simplified 4-category mood system with positive framing:
 * - gratitude (green) - Appreciating this moment, growth
 * - presence (blue) - Simply being here (covers calm, curiosity, rest)
 * - release (pink) - Letting go
 * - connection (gold) - Here with others, warmth
 */

/**
 * Galaxy Scene Palette - Kurzgesagt cell colors for icosahedral shards
 * Designed for visual harmony with the purple space environment
 *
 * Each color maps directly to one mood category (1:1 mapping)
 * Colors have consistent saturation (75-95%) and luminance (50-65%)
 * for visual balance across all moods
 */
export const GALAXY_SHARD_PALETTE = {
  gratitude: GALAXY_PALETTE.shards.gratitude, // Green cell - growth, appreciation
  presence: GALAXY_PALETTE.shards.presence, // Light blue cell - calm, awareness
  release: GALAXY_PALETTE.shards.release, // Pink cell - letting go
  connection: GALAXY_PALETTE.shards.connection, // Gold cell - warmth, unity
} as const;

/**
 * Extended Kurzgesagt shard colors for visual variety
 * Use these for random color selection to create rainbow cell effect
 */
export const EXTENDED_SHARD_COLORS = SHARD_COLORS;

/**
 * Monument Valley Palette - legacy colors (kept for reference)
 * @deprecated Use GALAXY_SHARD_PALETTE for galaxy scene
 */
export const MONUMENT_VALLEY_PALETTE = {
  gratitude: '#ffbe0b', // Warm Gold
  presence: '#06d6a0', // Teal/Mint
  release: '#118ab2', // Deep Blue
  connection: '#ef476f', // Warm Rose
} as const;

/**
 * Get the color for a mood ID using the galaxy palette
 * Direct 1:1 mapping - each mood has exactly one color
 */
export function getMoodColor(moodId: MoodId | '' | undefined): string {
  if (!moodId) return GALAXY_SHARD_PALETTE.presence;
  return GALAXY_SHARD_PALETTE[moodId] ?? GALAXY_SHARD_PALETTE.presence;
}

/**
 * @deprecated Use getMoodColor instead
 */
export function getMonumentValleyMoodColor(moodId: MoodId | '' | undefined): string {
  return getMoodColor(moodId);
}

/**
 * Current active palette for shards
 */
export const MOOD_COLORS = GALAXY_SHARD_PALETTE;
