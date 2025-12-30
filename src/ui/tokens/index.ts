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

// Z-index scale
export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
} as const;
