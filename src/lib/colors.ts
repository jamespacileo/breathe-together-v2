import type { MoodId } from '../constants';

/**
 * Color palettes and mood configurations
 */

/**
 * Monument Valley Palette - saturated colors for frosted ceramic shards
 * These colors are tinted through the refraction shader for the illustrative look
 */
export const MONUMENT_VALLEY_PALETTE = {
  joy: '#ffbe0b', // Warm Yellow (saturated)
  peace: '#06d6a0', // Teal/Mint (saturated)
  solitude: '#118ab2', // Deep Blue (saturated)
  love: '#ef476f', // Warm Rose (saturated)
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
