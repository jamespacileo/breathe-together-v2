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
 * Cosmic Nebula Palette - calming space colors inspired by real nebulae
 * Designed for meditation and deep space environments
 * Based on research of calming cosmic palettes (2025):
 * - Warm ambers from Eagle Nebula
 * - Teal/cyan from Helix Nebula
 * - Deep blues from stellar formations
 * - Pink/magenta from Orion Nebula
 *
 * Sources:
 * - HueHive AI Color Palette Generator (calming ethereal cosmic)
 * - Color Palette Studio Nebula collection
 * - Space color research from meditation app analysis
 *
 * These colors are processed through the gem shader for the illustrative look
 * Each color maps directly to one mood category (1:1 mapping)
 */
export const COSMIC_NEBULA_PALETTE = {
  gratitude: '#E8A87C', // Warm Amber - like Eagle Nebula, appreciation
  presence: '#5DD9C1', // Cosmic Teal - like Helix Nebula, calm presence
  release: '#6699CC', // Stellar Blue - deep space, letting go
  connection: '#D87BA8', // Nebula Pink - like Orion Nebula, togetherness
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
