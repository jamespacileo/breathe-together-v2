import { GALAXY_PALETTE } from '../config/galaxyPalette';
import type { MoodId } from '../constants';

/**
 * Color palettes and mood configurations
 *
 * Simplified 4-category mood system with positive framing:
 * - gratitude (green) - Appreciating this moment, growth
 * - presence (blue) - Simply being here (covers calm, curiosity, rest)
 * - release (coral) - Letting go
 * - connection (gold) - Here with others, warmth
 */

/**
 * Galaxy Scene Palette - vibrant colors for icosahedral shards
 * Designed for visual harmony with the galaxy/space environment
 *
 * Each color maps directly to one mood category (1:1 mapping)
 * Colors have consistent saturation (60-70%) and luminance (50-60%)
 * for visual balance across all moods
 */
export const GALAXY_SHARD_PALETTE = {
  gratitude: GALAXY_PALETTE.shards.gratitude, // Green - growth, appreciation
  presence: GALAXY_PALETTE.shards.presence, // Blue - calm, awareness
  release: GALAXY_PALETTE.shards.release, // Coral - letting go
  connection: GALAXY_PALETTE.shards.connection, // Gold - warmth, unity
} as const;

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
