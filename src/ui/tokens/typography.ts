/**
 * Gaia UI Typography Tokens
 *
 * Clean, meditative typography with generous letter spacing.
 */

export const typography = {
  // Font families
  fontFamily: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  },

  // Font sizes
  fontSize: {
    xs: '10px',
    sm: '12px',
    base: '14px',
    md: '16px',
    lg: '20px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '40px',
  },

  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },

  // Letter spacing
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.05em',
    wider: '0.1em',
    widest: '0.2em',
  },
} as const;

// Preset text styles
export const textStyles = {
  // Headings
  h1: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.light,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: typography.lineHeight.tight,
  },
  h2: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.light,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: typography.lineHeight.tight,
  },
  h3: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.normal,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: typography.lineHeight.tight,
  },

  // Body text
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: typography.lineHeight.normal,
  },
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: typography.lineHeight.normal,
  },

  // Labels
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: typography.letterSpacing.widest,
    lineHeight: typography.lineHeight.tight,
    textTransform: 'uppercase' as const,
  },
  labelMd: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: typography.letterSpacing.wider,
    lineHeight: typography.lineHeight.tight,
    textTransform: 'uppercase' as const,
  },

  // Accent text
  accent: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: typography.letterSpacing.wide,
    lineHeight: typography.lineHeight.tight,
  },

  // Numbers (for timers, counters)
  number: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.light,
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: typography.lineHeight.tight,
    fontVariantNumeric: 'tabular-nums' as const,
  },
  numberLarge: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.light,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: typography.lineHeight.tight,
    fontVariantNumeric: 'tabular-nums' as const,
  },
} as const;

export type TextStyle = keyof typeof textStyles;
