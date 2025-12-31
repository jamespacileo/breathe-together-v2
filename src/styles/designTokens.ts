/**
 * Design Tokens - Centralized design system for breathe-together-v2
 *
 * All colors, typography, spacing, and animation values should be imported from here.
 * This ensures consistency across all UI components.
 *
 * Usage:
 * ```tsx
 * import { UI_COLORS, TYPOGRAPHY, SPACING, ANIMATION } from '../styles/designTokens';
 *
 * <div style={{ color: UI_COLORS.text, fontFamily: TYPOGRAPHY.fontFamily.serif }}>
 * ```
 */

/**
 * UI Color Palette - Warm, earthy tones inspired by Monument Valley
 *
 * Colors are organized by semantic purpose, not visual appearance.
 * This makes it clear what each color is for and prevents misuse.
 */
export const UI_COLORS = {
  // Text hierarchy (dark to light)
  text: {
    primary: '#3d3229', // Darkest - headings, important text
    secondary: '#5a4d42', // Medium - body text, labels
    tertiary: '#7a6b5e', // Light - icons, secondary labels
    muted: '#8b7a6a', // Lightest - hints, placeholders
    dim: '#a89888', // Very light - disabled states
  },

  // Accent colors
  accent: {
    gold: '#c9a06c', // Primary accent - buttons, highlights
    goldLight: '#d4a574', // Lighter gold - progress bars, indicators
    goldGlow: 'rgba(201, 160, 108, 0.5)', // Glow effect for gold elements
    textGlow: '#c4a882', // Text glow/shadow color
  },

  // Backgrounds & surfaces
  surface: {
    glass: 'rgba(252, 250, 246, 0.72)', // Glass-morphism background
    glassLight: 'rgba(252, 250, 246, 0.6)', // Lighter glass (buttons)
    glassHover: 'rgba(252, 250, 246, 0.9)', // Hover state
    backdrop: 'rgba(253, 251, 247, 0.5)', // Soft backdrop
    backdropTransparent: 'rgba(253, 251, 247, 0)', // Gradient endpoint
    overlay: 'rgba(0, 0, 0, 0.3)', // Modal overlay
  },

  // Borders & dividers
  border: {
    default: 'rgba(160, 140, 120, 0.12)', // Standard border
    light: 'rgba(160, 140, 120, 0.15)', // Lighter border (icons)
    dark: 'rgba(140, 123, 108, 0.1)', // Darker border (HUD)
  },

  // Shadows
  shadow: {
    soft: '0 2px 12px rgba(0, 0, 0, 0.06)', // Default shadow
    medium: '0 6px 20px rgba(0, 0, 0, 0.1)', // Hover shadow
    strong: '0 20px 50px rgba(138, 131, 124, 0.08)', // Panel shadow
    glow: '0 0 8px rgba(201, 160, 108, 0.4)', // Accent glow
    glowStrong: '0 4px 16px rgba(201, 160, 108, 0.6)', // Strong accent glow
  },

  // Utility colors
  utility: {
    white: '#ffffff',
    subtleGlow: 'rgba(255, 252, 245, 1)', // Text glow on dark
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
 */
export const MOOD_COLORS = {
  gratitude: '#ffbe0b', // Warm Gold - appreciation, thankfulness
  presence: '#06d6a0', // Teal/Mint - being here, calm, curiosity, rest
  release: '#118ab2', // Deep Blue - letting go, processing
  connection: '#ef476f', // Warm Rose - love, community, togetherness
} as const;

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
    background: UI_COLORS.accent.gold,
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
