/**
 * Cosmic Meditation Color Palette
 *
 * A carefully curated palette for the galaxy/universe meditation scene.
 * Based on research from Color Hunt, ColorMagic, and cosmic design best practices.
 *
 * Design principles:
 * - Deep space backgrounds for calm, meditative atmosphere
 * - Nebula accents for depth and visual interest
 * - High contrast constellation stars for visibility
 * - Warm accents (sun, globe) for focal point
 *
 * Color theory basis:
 * - Analogous purples/blues for harmony
 * - Complementary warm tones for focal elements
 * - High luminance stars against low luminance background
 *
 * @see https://colorhunt.co/palettes/space
 * @see https://colormagic.app/palette/explore/space
 */

// ============================================================================
// BACKGROUND COLORS - Deep space tones
// ============================================================================

export const SPACE_BACKGROUND = {
  /** Deepest void - pure black with slight blue tint */
  voidBlack: '#050510',
  /** Dark matter - very dark blue-purple */
  darkMatter: '#0a0a1a',
  /** Deep space - rich navy */
  deepSpace: '#0d1020',
  /** Space blue - slightly lighter for gradients */
  spaceBlue: '#141428',
} as const;

// ============================================================================
// NEBULA COLORS - Cosmic cloud accents
// ============================================================================

export const NEBULA = {
  /** Deep purple nebula */
  purple: '#2a1a3a',
  /** Cosmic violet - brighter accent */
  violet: '#4a2a6a',
  /** Nebula rose - warm pink-purple */
  rose: '#3a1a2a',
  /** Cosmic teal - cool accent */
  teal: '#1a2a3a',
  /** Stellar blue - bright nebula highlight */
  blue: '#2a3a5a',
} as const;

// ============================================================================
// STAR COLORS - Constellation and background stars
// ============================================================================

export const STARS = {
  /** Primary star white - slightly warm */
  white: '#f8f4f0',
  /** Cool blue star */
  coolBlue: '#c8d8f8',
  /** Warm yellow star */
  warmYellow: '#f8e8c8',
  /** Hot blue star - brightest */
  hotBlue: '#a8c8f8',
  /** Red giant */
  red: '#f8c8a8',
} as const;

// ============================================================================
// CONSTELLATION LINE COLORS - Subtle connecting lines
// ============================================================================

export const CONSTELLATION_LINES = {
  /** Default line color - subtle cyan */
  default: '#4488aa',
  /** Bright constellation highlight */
  highlight: '#66aacc',
  /** Dim background constellations */
  dim: '#335566',
} as const;

// ============================================================================
// SUN COLORS - Central star and corona
// ============================================================================

export const SUN = {
  /** Core color - bright warm white */
  core: '#fffaf0',
  /** Inner corona - warm gold */
  innerCorona: '#ffcc66',
  /** Outer corona - orange */
  outerCorona: '#ff9944',
  /** Flare color */
  flare: '#ffeecc',
} as const;

// ============================================================================
// GLOBE COLORS - Earth in cosmic setting
// ============================================================================

export const GLOBE = {
  /** Ocean deep - dark teal */
  oceanDeep: '#1a3a4a',
  /** Ocean surface - brighter teal */
  oceanSurface: '#2a5a6a',
  /** Land base - earth tone */
  landBase: '#3a4a3a',
  /** Land highlight - lighter earth */
  landHighlight: '#5a6a5a',
  /** Atmosphere glow - subtle blue */
  atmosphere: '#4488aa',
  /** City lights - warm yellow */
  cityLights: '#ffcc88',
} as const;

// ============================================================================
// SHARD/PARTICLE COLORS - Mood-based crystal colors
// ============================================================================

export const SHARDS = {
  /** Gratitude - warm gold */
  gratitude: '#ffbe0b',
  /** Presence - cosmic teal */
  presence: '#06d6a0',
  /** Release - deep space blue */
  release: '#118ab2',
  /** Connection - warm rose */
  connection: '#ef476f',
  /** Default fallback */
  default: '#88aacc',
} as const;

// ============================================================================
// LIGHTING COLORS - Scene illumination
// ============================================================================

export const LIGHTING = {
  /** Ambient space light - very dim blue */
  ambient: '#1a1a2e',
  /** Sun key light - warm */
  sunKey: '#fff8e8',
  /** Rim light - cool blue for separation */
  rim: '#4466aa',
  /** Fill light - neutral cool */
  fill: '#666688',
} as const;

// ============================================================================
// UI COLORS - Interface elements
// ============================================================================

export const UI = {
  /** Text primary - high contrast white */
  textPrimary: '#f0f0f0',
  /** Text secondary - dimmer */
  textSecondary: '#a0a0b0',
  /** Accent color - cosmic teal */
  accent: '#4dd9e8',
  /** Background overlay */
  overlay: 'rgba(10, 10, 26, 0.85)',
} as const;

// ============================================================================
// COMPLETE PALETTE EXPORT
// ============================================================================

export const COSMIC_PALETTE = {
  background: SPACE_BACKGROUND,
  nebula: NEBULA,
  stars: STARS,
  constellationLines: CONSTELLATION_LINES,
  sun: SUN,
  globe: GLOBE,
  shards: SHARDS,
  lighting: LIGHTING,
  ui: UI,
} as const;

// ============================================================================
// COLOR UTILITY TYPES
// ============================================================================

export type CosmicPaletteCategory = keyof typeof COSMIC_PALETTE;
export type SpaceBackgroundColor = keyof typeof SPACE_BACKGROUND;
export type NebulaColor = keyof typeof NEBULA;
export type StarColor = keyof typeof STARS;
export type ShardColor = keyof typeof SHARDS;

// ============================================================================
// COLOR VALIDATION BOUNDS
// These define acceptable ranges for color harmony testing
// ============================================================================

/**
 * Luminance bounds for different element categories.
 * Used in vitest color harmony tests to ensure proper contrast.
 *
 * Luminance is calculated using the WCAG formula:
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B (where R, G, B are in 0-1 range)
 */
export const LUMINANCE_BOUNDS = {
  /** Background should be very dark (L < 0.08) */
  background: { min: 0.0, max: 0.08 },
  /** Nebula accents slightly brighter but still dark (0.01 < L < 0.15) */
  nebula: { min: 0.01, max: 0.15 },
  /** Stars should be bright (L > 0.55) - allows cooler/warmer tinted stars */
  stars: { min: 0.55, max: 1.0 },
  /** Constellation lines visible but subtle (0.08 < L < 0.45) */
  constellationLines: { min: 0.08, max: 0.45 },
  /** Sun extremely bright (L > 0.85) */
  sun: { min: 0.85, max: 1.0 },
  /** Globe medium-dark (0.08 < L < 0.70) - cityLights are brighter accent */
  globe: { min: 0.08, max: 0.7 },
  /** Shards visible against dark background (L > 0.20) */
  shards: { min: 0.2, max: 0.9 },
} as const;

/**
 * Saturation bounds for color harmony.
 * Saturation is calculated from HSL: S = (max - min) / (1 - |2L - 1|)
 */
export const SATURATION_BOUNDS = {
  /** Background subtle but visible color tint */
  background: { min: 0.0, max: 0.6 },
  /** Nebula moderate saturation */
  nebula: { min: 0.2, max: 0.6 },
  /** Stars low-high saturation (allows warm/cool/hot star types) */
  stars: { min: 0.0, max: 0.9 },
  /** Constellation lines low-medium */
  constellationLines: { min: 0.2, max: 0.5 },
  /** Sun low saturation (white-gold) */
  sun: { min: 0.0, max: 0.5 },
  /** Globe moderate saturation */
  globe: { min: 0.2, max: 0.5 },
  /** Shards moderate-high saturation (default shard is muted) */
  shards: { min: 0.35, max: 1.0 },
} as const;

/**
 * Contrast ratio requirements (WCAG 2.1 based).
 * Calculated as (L1 + 0.05) / (L2 + 0.05) where L1 > L2
 */
export const CONTRAST_REQUIREMENTS = {
  /** Stars against background: must be highly visible */
  starsVsBackground: 7.0,
  /** Constellation lines against background - subtle but visible */
  linesVsBackground: 2.5,
  /** UI text against background */
  textVsBackground: 4.5,
  /** Sun against background */
  sunVsBackground: 10.0,
} as const;

export default COSMIC_PALETTE;
