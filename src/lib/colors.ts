import type { MoodId } from '../constants';

/**
 * Color palettes and mood configurations
 */

/**
 * Monument Valley Palette - softened colors for frosted ceramic shards
 * Desaturated ~20% and shifted toward warm earth tones to harmonize with globe
 * Original saturated values: joy #ffbe0b, peace #06d6a0, solitude #118ab2, love #ef476f
 */
export const MONUMENT_VALLEY_PALETTE = {
  joy: '#e8c87a', // Warm Golden (softened, warmer undertone)
  peace: '#5fbfa8', // Soft Teal (desaturated, warmer)
  solitude: '#5a9cb8', // Muted Blue (desaturated, grayer)
  love: '#d98a98', // Dusty Rose (softened, earthy)
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
