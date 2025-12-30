/**
 * UI Primitives - Reusable building blocks for the breathing app
 *
 * Game-dev approach: Composable primitives that handle common patterns
 * like backdrop blur, glass cards, and cinematic text styling.
 */

import type { ReactNode } from 'react';
import { useViewport } from '../hooks/useViewport';
import {
  BLUR,
  COLORS,
  FONT_SIZES,
  radialBackdrop,
  responsive,
  SPACING,
  TRANSITIONS,
  TYPOGRAPHY,
  textGlow,
  Z_LAYERS,
} from './theme';

// =============================================================================
// OVERLAY BACKDROP
// =============================================================================

interface OverlayBackdropProps {
  /** Blur intensity */
  blur?: keyof typeof BLUR;
  /** Background opacity (0-1) */
  opacity?: number;
  /** z-index layer */
  zIndex?: number;
  /** Whether to block pointer events */
  blockEvents?: boolean;
  /** Click handler for dismissing */
  onClick?: () => void;
  /** CSS opacity for fade animation */
  visible?: boolean;
  children?: ReactNode;
}

/**
 * OverlayBackdrop - Semi-transparent blurred backdrop for modals/intros
 */
export function OverlayBackdrop({
  blur = 'light',
  opacity = 0.45,
  zIndex = Z_LAYERS.modal,
  blockEvents = true,
  onClick,
  visible = true,
  children,
}: OverlayBackdropProps) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Overlay backdrop needs click handler for dismissal
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: blockEvents ? 'auto' : 'none',
        opacity: visible ? 1 : 0,
        transition: TRANSITIONS.slow,
      }}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Escape' && onClick() : undefined}
      role="presentation"
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Blur layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: `blur(${BLUR[blur]}px)`,
          WebkitBackdropFilter: `blur(${BLUR[blur]}px)`,
          background: radialBackdrop(opacity, opacity * 0.5),
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
}

// =============================================================================
// GLASS CARD
// =============================================================================

interface GlassCardProps {
  children: ReactNode;
  /** Blur intensity */
  blur?: keyof typeof BLUR;
  /** Card opacity */
  opacity?: 'solid' | 'medium' | 'light' | 'subtle';
  /** Padding preset */
  padding?: 'none' | 'small' | 'medium' | 'large';
  /** Border radius */
  rounded?: 'small' | 'medium' | 'large' | 'pill';
  /** Animation state for scale/opacity */
  animated?: boolean;
  /** Stop event propagation */
  stopPropagation?: boolean;
  /** Additional styles */
  style?: React.CSSProperties;
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void;
}

const GLASS_OPACITY = {
  solid: COLORS.glass.solid,
  medium: COLORS.glass.medium,
  light: COLORS.glass.light,
  subtle: COLORS.glass.subtle,
};

const BORDER_RADIUS = {
  small: 16,
  medium: 24,
  large: 32,
  pill: 100,
};

/**
 * GlassCard - Frosted glass container with consistent styling
 */
export function GlassCard({
  children,
  blur = 'heavy',
  opacity = 'medium',
  padding = 'medium',
  rounded = 'large',
  animated = true,
  stopPropagation = false,
  style,
  onClick,
}: GlassCardProps) {
  const { deviceType, isMobile } = useViewport();

  const paddingValue =
    padding === 'none'
      ? 0
      : padding === 'small'
        ? responsive(deviceType, SPACING.gap)
        : padding === 'large'
          ? responsive(deviceType, SPACING.modal)
          : responsive(deviceType, SPACING.section);

  const borderRadius = isMobile ? Math.min(BORDER_RADIUS[rounded], 20) : BORDER_RADIUS[rounded];

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    onClick?.(e);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: GlassCard container may have click handlers for modals
    <div
      role="presentation"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      style={{
        background: GLASS_OPACITY[opacity],
        backdropFilter: `blur(${BLUR[blur]}px)`,
        WebkitBackdropFilter: `blur(${BLUR[blur]}px)`,
        borderRadius,
        border: `1px solid ${COLORS.border.light}`,
        padding: paddingValue,
        opacity: animated ? 1 : 0,
        transform: animated ? 'scale(1)' : 'scale(0.96)',
        transition: TRANSITIONS.modal,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// =============================================================================
// CINEMATIC TEXT
// =============================================================================

interface CinematicTextProps {
  children: ReactNode;
  /** Text size variant */
  variant?: 'hero' | 'title' | 'subtitle' | 'body';
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Glow intensity */
  glow?: 'subtle' | 'normal' | 'strong' | 'none';
  /** Include soft backdrop for readability */
  withBackdrop?: boolean;
  /** HTML element to render */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  /** Additional styles */
  style?: React.CSSProperties;
}

/**
 * CinematicText - Styled text matching the inspirational text aesthetic
 */
export function CinematicText({
  children,
  variant = 'title',
  align = 'center',
  glow = 'normal',
  withBackdrop = false,
  as: Component = 'p',
  style,
}: CinematicTextProps) {
  const { deviceType, isMobile } = useViewport();

  const fontSize =
    variant === 'hero'
      ? responsive(deviceType, FONT_SIZES.heroTitle)
      : variant === 'title'
        ? responsive(deviceType, FONT_SIZES.title)
        : variant === 'subtitle'
          ? responsive(deviceType, FONT_SIZES.subtitle)
          : responsive(deviceType, FONT_SIZES.body);

  const typographyStyle =
    variant === 'body'
      ? TYPOGRAPHY.styles.body
      : variant === 'hero'
        ? TYPOGRAPHY.styles.heroTitle
        : TYPOGRAPHY.styles.title;

  const letterSpacing = isMobile
    ? variant === 'hero'
      ? '0.15em'
      : '0.1em'
    : typographyStyle.letterSpacing;

  const textStyle: React.CSSProperties = {
    ...typographyStyle,
    fontSize,
    letterSpacing,
    color: COLORS.text.primary,
    textShadow: glow === 'none' ? 'none' : textGlow(glow),
    textAlign: align,
    userSelect: 'none',
    margin: 0,
    ...style,
  };

  const content = <Component style={textStyle}>{children}</Component>;

  if (withBackdrop) {
    return (
      <div
        style={{
          padding: isMobile ? '12px 20px' : 'clamp(20px, 4vw, 40px) clamp(40px, 10vw, 100px)',
          background: radialBackdrop(0.5, 0),
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          borderRadius: isMobile ? 40 : 100,
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}

// =============================================================================
// PRIMARY BUTTON
// =============================================================================

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Whether button is disabled */
  disabled?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Additional styles */
  style?: React.CSSProperties;
}

/**
 * PrimaryButton - Golden accent CTA button
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Button component needs responsive size/disabled state logic
export function PrimaryButton({
  children,
  onClick,
  size = 'medium',
  disabled = false,
  fullWidth = false,
  style,
}: PrimaryButtonProps) {
  const { isMobile } = useViewport();

  const padding =
    size === 'small'
      ? isMobile
        ? '10px 20px'
        : '10px 24px'
      : size === 'large'
        ? isMobile
          ? '16px 40px'
          : '20px 56px'
        : isMobile
          ? '12px 32px'
          : '14px 40px';

  const fontSize =
    size === 'small'
      ? '0.7rem'
      : size === 'large'
        ? isMobile
          ? '0.9rem'
          : '1rem'
        : isMobile
          ? '0.8rem'
          : '0.85rem';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        ...TYPOGRAPHY.styles.button,
        background: disabled ? COLORS.text.dim : COLORS.accent.gold,
        color: '#fff',
        border: 'none',
        padding,
        borderRadius: 40,
        fontSize,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : 'auto',
        boxShadow: disabled
          ? 'none'
          : `
          0 4px 20px ${COLORS.accent.goldGlow},
          0 8px 40px rgba(201, 160, 108, 0.2)
        `,
        transition: TRANSITIONS.normal,
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = COLORS.accent.goldHover;
          e.currentTarget.style.transform = 'scale(1.02)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = COLORS.accent.gold;
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
    >
      {children}
    </button>
  );
}

// =============================================================================
// CENTERED LAYOUT
// =============================================================================

interface CenteredLayoutProps {
  children: ReactNode;
  /** Gap between items */
  gap?: 'small' | 'medium' | 'large' | 'xlarge';
  /** Additional styles */
  style?: React.CSSProperties;
}

const GAP_SIZES = {
  small: 'clamp(20px, 4vh, 40px)',
  medium: 'clamp(40px, 8vh, 80px)',
  large: 'clamp(60px, 12vh, 120px)',
  xlarge: 'clamp(80px, 16vh, 160px)',
};

/**
 * CenteredLayout - Vertically centered flex layout for intro/modal content
 */
export function CenteredLayout({ children, gap = 'large', style }: CenteredLayoutProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: GAP_SIZES[gap],
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
