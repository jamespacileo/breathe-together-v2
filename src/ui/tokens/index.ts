/**
 * Gaia UI Design Tokens
 *
 * Centralized design system tokens for the Gaia breathing app.
 */

export type { ColorToken } from './colors';
export { colors } from './colors';
export type { RadiusToken, SpacingToken } from './spacing';
export { blur, radius, spacing } from './spacing';
export type { TextStyle } from './typography';
export { textStyles, typography } from './typography';

// Re-export as unified tokens object for convenience
import { colors } from './colors';
import { blur, radius, spacing } from './spacing';
import { textStyles, typography } from './typography';

export const tokens = {
  colors,
  spacing,
  radius,
  blur,
  typography,
  textStyles,
} as const;

// Animation tokens
export const animation = {
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    slower: '600ms',
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// Z-index scale - high values to ensure UI is above R3F Canvas
export const zIndex = {
  base: 1000,
  dropdown: 1100,
  sticky: 1200,
  overlay: 1300,
  modal: 1400,
  toast: 1500,
  tooltip: 1600,
} as const;
