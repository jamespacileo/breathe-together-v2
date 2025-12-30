import type { MoodId } from '../constants';

/**
 * Color palettes and mood configurations
 */

/**
 * Monument Valley Palette - soft pastel colors for frosted ceramic shards
 * Muted tones complement the globe's teal ocean and warm earth aesthetic
 */
export const MONUMENT_VALLEY_PALETTE = {
  joy: '#e8a850', // Warm Amber
  peace: '#4db8a8', // Soft Teal
  solitude: '#6a9fc0', // Muted Sky Blue
  love: '#d08080', // Dusty Coral
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
