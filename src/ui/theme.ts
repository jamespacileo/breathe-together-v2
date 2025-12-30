/**
 * UI Theme - Centralized design tokens for the breathing app
 *
 * Game-dev inspired approach: Single source of truth for all UI styling.
 * Import this instead of defining colors/spacing inline in components.
 */

// =============================================================================
// Z-INDEX LAYERS (Game UI Layer System)
// =============================================================================
export const Z_LAYERS = {
  /** Background elements, particles */
  background: 0,
  /** 3D scene content */
  scene: 10,
  /** Inspirational text overlay */
  text: 50,
  /** Main HUD elements (phase indicator, presence count) */
  hud: 100,
  /** Control buttons, panels */
  controls: 150,
  /** Modal backdrops and content */
  modal: 200,
  /** Settings, mood selection modals */
  modalContent: 250,
  /** Cinematic intro overlay */
  intro: 400,
  /** Critical overlays (error, loading) */
  critical: 500,
} as const;

// =============================================================================
// COLOR PALETTE (Monument Valley inspired warm tones)
// =============================================================================
export const COLORS = {
  // Primary text colors
  text: {
    primary: '#5a4d42',
    secondary: '#7a6b5e',
    dim: '#8b7a6a',
    dark: '#3d3229', // High contrast for important text
  },

  // Accent colors
  accent: {
    gold: '#c9a06c',
    goldHover: '#b8935f',
    goldGlow: 'rgba(201, 160, 108, 0.5)',
  },

  // Glass/backdrop colors
  glass: {
    solid: 'rgba(252, 250, 246, 0.9)',
    medium: 'rgba(252, 250, 246, 0.72)',
    light: 'rgba(252, 250, 246, 0.5)',
    subtle: 'rgba(253, 251, 247, 0.45)',
    faint: 'rgba(253, 251, 247, 0.25)',
  },

  // Glow effects
  glow: {
    warm: 'rgba(201, 160, 108, 0.8)',
    white: 'rgba(255, 252, 245, 0.98)',
    subtle: 'rgba(255, 252, 245, 0.95)',
  },

  // Borders
  border: {
    light: 'rgba(160, 140, 120, 0.12)',
    medium: 'rgba(160, 140, 120, 0.2)',
  },

  // Shadows
  shadow: {
    text: '0 2px 8px rgba(0, 0, 0, 0.1)',
    textStrong: '0 2px 8px rgba(0, 0, 0, 0.15)',
    card: '0 20px 50px rgba(138, 131, 124, 0.08)',
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================
export const TYPOGRAPHY = {
  fontFamily: {
    display: "'Cormorant Garamond', Georgia, serif",
    body: "'DM Sans', system-ui, -apple-system, sans-serif",
  },

  // Pre-defined text styles
  styles: {
    heroTitle: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontWeight: 300,
      letterSpacing: '0.25em',
      textTransform: 'uppercase' as const,
      lineHeight: 1.2,
    },
    title: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontWeight: 300,
      letterSpacing: '0.2em',
      textTransform: 'uppercase' as const,
      lineHeight: 1.3,
    },
    subtitle: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontWeight: 300,
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const,
      lineHeight: 1.4,
    },
    body: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontWeight: 400,
      letterSpacing: '0.02em',
      lineHeight: 1.6,
    },
    label: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontWeight: 600,
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const,
      fontSize: '0.65rem',
    },
    button: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontWeight: 600,
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const,
    },
  },
} as const;

// =============================================================================
// RESPONSIVE BREAKPOINTS & SPACING
// =============================================================================
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
} as const;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/** Responsive spacing presets (in px) */
export const SPACING = {
  edge: { mobile: 16, tablet: 24, desktop: 32 },
  modal: { mobile: 24, tablet: 32, desktop: 40 },
  gap: { mobile: 8, tablet: 12, desktop: 16 },
  section: { mobile: 16, tablet: 20, desktop: 24 },
} as const;

/** Responsive font sizes (in rem) */
export const FONT_SIZES = {
  heroTitle: {
    mobile: 'clamp(2rem, 8vw, 4rem)',
    tablet: 'clamp(2.5rem, 6vw, 3.5rem)',
    desktop: 'clamp(2.2rem, 5vw, 4rem)',
  },
  title: {
    mobile: 'clamp(1.3rem, 6vw, 2rem)',
    tablet: 'clamp(1.5rem, 4vw, 2.2rem)',
    desktop: 'clamp(1.6rem, 3.5vw, 2.8rem)',
  },
  subtitle: { mobile: '1.1rem', tablet: '1.25rem', desktop: '1.4rem' },
  modalTitle: { mobile: '1.4rem', tablet: '1.6rem', desktop: '1.8rem' },
  body: { mobile: '0.875rem', tablet: '0.95rem', desktop: '1rem' },
  small: { mobile: '0.7rem', tablet: '0.65rem', desktop: '0.65rem' },
} as const;

// =============================================================================
// ANIMATION PRESETS
// =============================================================================
export const TRANSITIONS = {
  fast: '0.2s ease',
  normal: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '0.6s cubic-bezier(0.4, 0, 0.2, 1)',
  modal: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const BLUR = {
  none: 0,
  subtle: 4,
  light: 8,
  medium: 20,
  heavy: 40,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get responsive value based on device type */
export function responsive<T>(
  deviceType: DeviceType,
  values: { mobile: T; tablet?: T; desktop?: T },
): T {
  switch (deviceType) {
    case 'mobile':
      return values.mobile;
    case 'tablet':
      return values.tablet ?? values.mobile;
    case 'desktop':
      return values.desktop ?? values.tablet ?? values.mobile;
  }
}

/** Generate text shadow for glowing text */
export function textGlow(intensity: 'subtle' | 'normal' | 'strong' = 'normal'): string {
  const glowOpacity = intensity === 'subtle' ? 0.5 : intensity === 'strong' ? 1 : 0.8;
  return `
    0 0 30px rgba(255, 252, 245, ${glowOpacity}),
    0 0 60px rgba(201, 160, 108, ${glowOpacity * 0.8}),
    0 2px 8px rgba(0, 0, 0, 0.1)
  `.trim();
}

/** Generate radial gradient backdrop */
export function radialBackdrop(innerOpacity = 0.5, outerOpacity = 0): string {
  return `radial-gradient(
    ellipse 120% 100% at center,
    rgba(253, 251, 247, ${innerOpacity}) 0%,
    rgba(253, 251, 247, ${outerOpacity}) 65%
  )`;
}
