import type { MoodId } from '../constants';

/**
 * Color palettes and mood configurations
 */

/**
 * Monument Valley Palette - soft pastel colors for frosted ceramic shards
 * Muted tones complement the globe's teal ocean and warm earth aesthetic
 */
export const MONUMENT_VALLEY_PALETTE = {
  joy: '#e8c078', // Soft Golden Sand
  peace: '#7ac5b8', // Soft Seafoam Teal
  solitude: '#8dafc4', // Dusty Periwinkle Blue
  love: '#d4a0a0', // Soft Dusty Rose
} as const;

/**
 * Map existing 7 moods to 4 Monument Valley colors
 * Maintains backward compatibility while shifting aesthetic
 */
export function getMonumentValleyMoodColor(moodId: MoodId | '' | undefined): string {
  if (!moodId) return MONUMENT_VALLEY_PALETTE.peace;

  const mapping: Record<MoodId, string> = {
    // Joy cluster - energetic, celebratory
    grateful: MONUMENT_VALLEY_PALETTE.joy,
    celebrating: MONUMENT_VALLEY_PALETTE.joy,

    // Peace cluster - present, grounded
    moment: MONUMENT_VALLEY_PALETTE.peace,
    here: MONUMENT_VALLEY_PALETTE.peace,

    // Solitude cluster - introspective, processing
    anxious: MONUMENT_VALLEY_PALETTE.solitude,
    processing: MONUMENT_VALLEY_PALETTE.solitude,

    // Love cluster - connecting, preparing
    preparing: MONUMENT_VALLEY_PALETTE.love,
  };

  return mapping[moodId as MoodId] ?? MONUMENT_VALLEY_PALETTE.peace;
}
