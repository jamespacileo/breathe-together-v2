/**
 * Gaia UI Color Tokens
 *
 * Warm earth tones with glass morphism support.
 * Inspired by Monument Valley and meditative aesthetics.
 */

export const colors = {
  // Surface colors (glass morphism)
  surface: {
    glass: 'rgba(250, 248, 243, 0.7)',
    glassSubtle: 'rgba(250, 248, 243, 0.5)',
    glassStrong: 'rgba(250, 248, 243, 0.85)',
    glassSolid: '#faf8f3',
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },

  // Accent colors
  accent: {
    primary: '#d4a574', // Warm gold
    primaryHover: '#c49464',
    primaryMuted: 'rgba(212, 165, 116, 0.2)',
  },

  // Text colors
  text: {
    primary: '#8c7b6c', // Warm gray
    secondary: '#b8a896', // Lighter gray
    dim: '#c5b8aa', // Very light
    inverse: '#fffef7', // Light text on dark
    accent: '#d4a574', // Gold text
  },

  // Border colors
  border: {
    subtle: 'rgba(140, 123, 108, 0.15)',
    medium: 'rgba(140, 123, 108, 0.25)',
    strong: 'rgba(140, 123, 108, 0.4)',
  },

  // Shadow colors
  shadow: {
    soft: 'rgba(138, 131, 124, 0.08)',
    medium: 'rgba(138, 131, 124, 0.12)',
    strong: 'rgba(138, 131, 124, 0.2)',
  },

  // Semantic colors
  semantic: {
    success: '#06d6a0',
    warning: '#ffbe0b',
    error: '#ef476f',
    info: '#118ab2',
  },

  // Mood palette (Monument Valley inspired)
  mood: {
    joy: '#ffbe0b',
    peace: '#06d6a0',
    solitude: '#118ab2',
    love: '#ef476f',
  },
} as const;

export type ColorToken = typeof colors;
