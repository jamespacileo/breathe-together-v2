/**
 * Design Tokens - Centralized design system for breathe-together-v2
 *
 * All colors, typography, spacing, and animation values should be imported from here.
 * This ensures consistency across all UI components.
 *
 * Note: MOOD_COLORS is exported from src/lib/colors.ts (single source of truth)
 * Re-exported here for convenience.
 *
 * Usage:
 * ```tsx
 * import { UI_COLORS, TYPOGRAPHY, SPACING, ANIMATION, MOOD_COLORS } from '../styles/designTokens';
 *
 * <div style={{ color: UI_COLORS.text, fontFamily: TYPOGRAPHY.fontFamily.serif }}>
 * ```
 */

// Re-export MOOD_COLORS from canonical source for convenience
export { MOOD_COLORS } from '../lib/colors';

/**
 * UI Color Palette - Warm, earthy tones inspired by Monument Valley
 *
 * Colors are organized by semantic purpose, not visual appearance.
 * This makes it clear what each color is for and prevents misuse.
 */
export const UI_COLORS = {
  // Text hierarchy (cosmic blue-gray scale)
  // For use on LIGHT backgrounds (glass panels, modals)
  text: {
    primary: '#1a2f4d', // Deep blue-gray - headings, important text
    secondary: '#2d4a66', // Medium blue-gray - body text, labels
    tertiary: '#4a6b8a', // Light blue-gray - icons, secondary labels
    muted: '#6b88a3', // Muted blue - hints, placeholders
    dim: '#8fa3b8', // Very light blue - disabled states
  },

  // Text for DARK backgrounds (direct on scene, overlays)
  // High contrast white/light text for readability on cosmic blue gradient
  textOnDark: {
    primary: '#ffffff', // Pure white - main text, titles
    secondary: '#e6f2ff', // Very light blue - body text, labels (4.5:1 on dark blue)
    tertiary: '#b8d4e8', // Light blue - secondary text (3:1 on dark blue)
    muted: '#8fb8d1', // Muted light blue - hints (still legible)
    accent: '#4de6de', // Neon teal - accent text (very high contrast)
  },

  // Accent colors (dynamic - updated by useMoodAccentInjection hook)
  accent: {
    default: '#4de6de', // Presence teal (default)
    defaultGlow: 'rgba(77, 230, 222, 0.5)', // Default glow
    textGlow: 'rgba(77, 230, 222, 0.8)', // Text glow/shadow
  },

  // Backgrounds & surfaces (cosmic alice blue)
  surface: {
    glass: 'rgba(240, 248, 255, 0.85)', // Alice blue glass - INCREASED opacity for better text contrast
    glassLight: 'rgba(240, 248, 255, 0.72)', // Lighter glass (buttons) - swapped values
    glassHover: 'rgba(240, 248, 255, 0.92)', // Hover state - INCREASED for clarity
    backdrop: 'rgba(240, 248, 255, 0.4)', // Soft backdrop
    backdropTransparent: 'rgba(240, 248, 255, 0)', // Gradient endpoint
    overlay: 'rgba(21, 43, 77, 0.5)', // Navy overlay - INCREASED opacity
  },

  // Borders & dividers (cosmic teal/navy)
  border: {
    default: 'rgba(58, 150, 174, 0.4)', // Teal border - INCREASED visibility
    light: 'rgba(58, 150, 174, 0.25)', // Light teal (subtle)
    dark: 'rgba(21, 43, 77, 0.5)', // Navy border (HUD) - INCREASED
    onDark: 'rgba(240, 248, 255, 0.3)', // White/light border for dark backgrounds
  },

  // Shadows (cosmic tones)
  shadow: {
    soft: '0 2px 12px rgba(21, 43, 77, 0.08)', // Navy shadow
    medium: '0 6px 20px rgba(21, 43, 77, 0.12)', // Deeper navy
    strong: '0 20px 50px rgba(58, 150, 174, 0.15)', // Teal shadow
    glow: '0 0 8px var(--color-accent-glow)', // Dynamic glow (uses CSS variable)
    glowStrong: '0 4px 16px var(--color-accent-glow)', // Strong dynamic glow
  },

  // Utility colors
  utility: {
    white: '#ffffff',
    subtleGlow: 'rgba(240, 248, 255, 1)', // Alice blue glow
  },
} as const;

/**
 * Monument Valley Mood Palette
 * Used for mood selection and particle colors
 *
 * Simplified 4-category system with positive framing:
 * - gratitude: Appreciating this moment
 * - presence: Simply being here (covers calm, curiosity, rest)
 * - release: Letting go
 * - connection: Here with others
 *
 * NOTE: MOOD_COLORS is re-exported from src/lib/colors.ts at the top of this file
 * (single source of truth to avoid duplication)
 */

/**
 * Typography system
 */
export const TYPOGRAPHY = {
  fontFamily: {
    serif: "'Cormorant Garamond', Georgia, serif",
    sans: "'DM Sans', system-ui, -apple-system, sans-serif",
    system: 'system-ui, -apple-system, sans-serif',
  },

  // Font weights
  weight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
  },

  // Letter spacing
  letterSpacing: {
    tight: '0.02em',
    normal: '0.05em',
    wide: '0.08em',
    wider: '0.1em',
    widest: '0.15em',
    ultraWide: '0.18em',
    uppercase: '0.12em', // For small-caps/uppercase
  },

  // Line heights
  lineHeight: {
    tight: 1.1,
    normal: 1.2,
    relaxed: 1.6,
    loose: 1.8,
  },
} as const;

/**
 * Spacing scale (in pixels)
 * Based on 4px grid with Fibonacci-influenced values
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 60,
} as const;

/**
 * Border radius values
 */
export const BORDER_RADIUS = {
  sm: 3,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  full: '50%',
  pill: 100,
} as const;

/**
 * Animation timing
 */
export const ANIMATION = {
  // Durations (in ms)
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 400,
    slower: 600,
    slowest: 800,
    fade: 1200,
  },

  // Easing curves
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    easeIn: 'ease-in',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

/**
 * Breathing phase names - single source of truth
 */
export const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;

/**
 * Z-index scale for layering
 */
export const Z_INDEX = {
  base: 0,
  overlay: 50,
  hud: 100,
  modal: 200,
  modalBackdrop: 300,
  tooltip: 400,
} as const;

/**
 * Blur values for backdrop-filter
 */
export const BLUR = {
  subtle: 'blur(3px)',
  light: 'blur(8px)',
  medium: 'blur(20px)',
  heavy: 'blur(24px)',
  intense: 'blur(40px)',
} as const;

/**
 * Pre-composed style objects for common patterns
 */
export const STYLES = {
  // Glass-morphism panel
  glassPanel: {
    background: UI_COLORS.surface.glass,
    backdropFilter: BLUR.intense,
    WebkitBackdropFilter: BLUR.intense,
    border: `1px solid ${UI_COLORS.border.default}`,
    borderRadius: BORDER_RADIUS.xl,
  } as React.CSSProperties,

  // Glass button (smaller elements)
  glassButton: {
    background: UI_COLORS.surface.glassLight,
    backdropFilter: BLUR.medium,
    WebkitBackdropFilter: BLUR.medium,
    border: `1px solid ${UI_COLORS.border.light}`,
    borderRadius: BORDER_RADIUS.full,
  } as React.CSSProperties,

  // Primary accent button
  accentButton: {
    background: UI_COLORS.accent.default,
    color: UI_COLORS.utility.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: TYPOGRAPHY.letterSpacing.uppercase,
  } as React.CSSProperties,

  // Section header text
  sectionHeader: {
    fontSize: '0.65rem',
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: UI_COLORS.text.muted,
    letterSpacing: TYPOGRAPHY.letterSpacing.uppercase,
    fontVariant: 'small-caps' as const,
    marginBottom: SPACING.md,
    borderBottom: `1px solid ${UI_COLORS.border.default}`,
    paddingBottom: SPACING.xs + 2,
  } as React.CSSProperties,

  // Label text
  label: {
    fontSize: '0.72rem',
    fontWeight: TYPOGRAPHY.weight.medium,
    fontVariant: 'small-caps' as const,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    color: UI_COLORS.text.secondary,
    marginBottom: SPACING.sm,
    display: 'flex',
    justifyContent: 'space-between',
  } as React.CSSProperties,
} as const;
