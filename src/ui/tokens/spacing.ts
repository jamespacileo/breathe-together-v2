/**
 * Gaia UI Spacing Tokens
 *
 * Fibonacci-inspired spacing scale for harmonious layouts.
 * Values: 4, 8, 13, 21, 34, 55, 89
 */

export const spacing = {
  // Core spacing scale
  0: '0px',
  xs: '4px',
  sm: '8px',
  md: '13px',
  lg: '21px',
  xl: '34px',
  '2xl': '55px',
  '3xl': '89px',

  // Numeric access (for calculations)
  values: {
    0: 0,
    xs: 4,
    sm: 8,
    md: 13,
    lg: 21,
    xl: 34,
    '2xl': 55,
    '3xl': 89,
  },
} as const;

export const radius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '16px',
  xl: '24px',
  pill: '9999px',
} as const;

export const blur = {
  sm: '8px',
  md: '20px',
  lg: '40px',
} as const;

export type SpacingToken = keyof typeof spacing.values;
export type RadiusToken = keyof typeof radius;
