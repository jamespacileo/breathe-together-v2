/**
 * Gaia UI Design Tokens
 * Centralized design system constants for consistent styling
 */

/**
 * Color palette - warm neutrals with gold accent
 */
export const colors = {
  // Primary text colors
  text: '#8c7b6c',
  textDim: '#b8a896',
  textLight: '#c4b5a5',

  // Background colors
  background: '#faf5ed',
  backgroundDark: '#f0ebe3',

  // Accent colors
  accent: '#d4a574',
  accentHover: '#c49664',
  accentLight: '#e8c9a8',

  // Border colors
  border: 'rgba(140, 123, 108, 0.15)',
  borderLight: 'rgba(140, 123, 108, 0.08)',

  // Glass effect
  glass: 'rgba(250, 248, 243, 0.7)',
  glassLight: 'rgba(250, 248, 243, 0.5)',
  glassDark: 'rgba(250, 248, 243, 0.85)',

  // Status colors
  success: '#06d6a0',
  warning: '#ffbe0b',
  error: '#ef476f',

  // Monument Valley mood colors
  mood: {
    joy: '#ffbe0b',
    peace: '#06d6a0',
    solitude: '#118ab2',
    love: '#ef476f',
  },
} as const;

/**
 * Typography
 */
export const typography = {
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',

  // Font sizes
  fontSize: {
    xs: '0.6rem',
    sm: '0.75rem',
    base: '1rem',
    lg: '1.2rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '2.5rem',
  },

  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Letter spacing
  letterSpacing: {
    tight: '-0.01em',
    normal: '0',
    wide: '0.1em',
    wider: '0.15em',
    widest: '0.3em',
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

/**
 * Spacing (Fibonacci-inspired)
 */
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
} as const;

/**
 * Border radius
 */
export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '20px',
  xl: '24px',
  full: '9999px',
} as const;

/**
 * Shadows
 */
export const shadows = {
  sm: '0 4px 12px rgba(138, 131, 124, 0.06)',
  md: '0 8px 24px rgba(138, 131, 124, 0.08)',
  lg: '0 20px 50px rgba(138, 131, 124, 0.12)',
  xl: '0 30px 70px rgba(138, 131, 124, 0.15)',
} as const;

/**
 * Transitions
 */
export const transitions = {
  fast: '0.15s ease',
  normal: '0.3s ease',
  slow: '0.5s ease',
  slower: '1s ease',
  spring: '0.5s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * Z-index layers
 */
export const zIndex = {
  background: -1,
  base: 0,
  overlay: 10,
  modal: 100,
  toast: 200,
} as const;

/**
 * Common style mixins
 */
export const mixins = {
  // Glass panel effect
  glassPanel: {
    background: colors.glass,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.xl,
  } as React.CSSProperties,

  // Glass panel darker
  glassPanelDark: {
    background: colors.glassDark,
    backdropFilter: 'blur(40px)',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.xl,
  } as React.CSSProperties,

  // Label text style (uppercase, small)
  labelText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wider,
    color: colors.text,
  } as React.CSSProperties,

  // Heading text style
  headingText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.light,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
    color: colors.text,
  } as React.CSSProperties,

  // Center content
  centerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,

  // Fullscreen overlay
  fullscreenOverlay: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
} as const;
