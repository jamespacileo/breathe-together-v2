import type { CSSProperties, ReactNode } from 'react';
import { colors } from '../tokens/colors';
import { blur, radius, spacing } from '../tokens/spacing';

export interface GlassCardProps {
  children: ReactNode;
  /** Glass intensity - affects opacity and blur */
  intensity?: 'subtle' | 'medium' | 'strong';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Border radius */
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'pill';
  /** Additional inline styles */
  style?: CSSProperties;
  /** Click handler */
  onClick?: () => void;
  /** CSS class name */
  className?: string;
  /** HTML element to render */
  as?: 'div' | 'section' | 'article' | 'aside';
}

const intensityMap = {
  subtle: {
    background: colors.surface.glassSubtle,
    blur: blur.sm,
    border: colors.border.subtle,
    shadow: colors.shadow.soft,
  },
  medium: {
    background: colors.surface.glass,
    blur: blur.md,
    border: colors.border.subtle,
    shadow: colors.shadow.medium,
  },
  strong: {
    background: colors.surface.glassStrong,
    blur: blur.lg,
    border: colors.border.medium,
    shadow: colors.shadow.strong,
  },
} as const;

const paddingMap = {
  none: spacing[0],
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
} as const;

/**
 * GlassCard - A frosted glass container component
 *
 * The foundation of Gaia's visual design language.
 * Uses backdrop blur for glass morphism effect.
 */
export function GlassCard({
  children,
  intensity = 'medium',
  padding = 'lg',
  rounded = 'xl',
  style,
  onClick,
  className,
  as: Component = 'div',
}: GlassCardProps) {
  const intensityStyles = intensityMap[intensity];

  const cardStyle: CSSProperties = {
    background: intensityStyles.background,
    backdropFilter: `blur(${intensityStyles.blur})`,
    WebkitBackdropFilter: `blur(${intensityStyles.blur})`,
    border: `1px solid ${intensityStyles.border}`,
    borderRadius: radius[rounded],
    boxShadow: `0 8px 32px ${intensityStyles.shadow}`,
    padding: paddingMap[padding],
    transition: 'all 250ms ease',
    cursor: onClick ? 'pointer' : undefined,
    ...style,
  };

  return (
    <Component
      className={className}
      style={cardStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </Component>
  );
}
