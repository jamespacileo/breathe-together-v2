/**
 * Panel Component
 * Consistent glass-panel styling for UI containers
 */

import {
  borderRadius,
  colors,
  mixins,
  shadows,
  spacing,
  transitions,
  typography,
} from '../../styles/designTokens';

export interface PanelProps {
  /** Panel content */
  children: React.ReactNode;
  /** Panel variant */
  variant?: 'glass' | 'glassDark' | 'solid' | 'transparent';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Optional title */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Custom CSS styles */
  style?: React.CSSProperties;
  /** Click handler */
  onClick?: () => void;
  /** Center content */
  centered?: boolean;
}

export function Panel({
  children,
  variant = 'glass',
  padding = 'lg',
  title,
  subtitle,
  style,
  onClick,
  centered = false,
}: PanelProps) {
  const paddingMap = {
    none: '0',
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.xl,
    xl: spacing['2xl'],
  };

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'glass':
        return {
          ...mixins.glassPanel,
          boxShadow: shadows.md,
        };
      case 'glassDark':
        return {
          ...mixins.glassPanelDark,
          boxShadow: shadows.lg,
        };
      case 'solid':
        return {
          background: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.xl,
          boxShadow: shadows.md,
        };
      case 'transparent':
        return {
          background: 'transparent',
          border: 'none',
        };
      default:
        return {};
    }
  };

  // When onClick is provided, the Panel becomes interactive with role="button"
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Panel uses conditional role="button" for interactive mode; using a wrapper allows flexible content structure
    <div
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        ...getVariantStyles(),
        padding: paddingMap[padding],
        transition: transitions.normal,
        cursor: onClick ? 'pointer' : 'default',
        ...(centered && mixins.centerContent),
        flexDirection: centered ? 'column' : undefined,
        ...style,
      }}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: spacing.lg, textAlign: centered ? 'center' : 'left' }}>
          {title && (
            <h2
              style={{
                ...mixins.headingText,
                margin: 0,
                marginBottom: subtitle ? spacing.xs : 0,
              }}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.textDim,
                margin: 0,
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
