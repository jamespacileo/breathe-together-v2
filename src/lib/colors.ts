import type { MoodId } from '../constants';

/**
 * Color palettes and mood configurations
 */

/**
 * Monument Valley Palette - simplified 4-mood aesthetic
 * Matches the HTML artifact color scheme
 */
export const MONUMENT_VALLEY_PALETTE = {
  joy: '#ffbe0b', // Yellow (bright, energetic)
  peace: '#06d6a0', // Teal (calm, flowing)
  solitude: '#118ab2', // Sky blue (introspective)
  love: '#ef476f', // Rose pink (warm, connective)
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
