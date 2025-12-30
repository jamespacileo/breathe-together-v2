import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useState,
} from 'react';
import { colors } from '../tokens/colors';
import { radius, spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

/**
 * Stop pointer events from propagating to prevent 3D scene interaction
 */
const stopPropagation = (e: PointerEvent<HTMLButtonElement>) => {
  e.stopPropagation();
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  children: ReactNode;
  /** Button visual variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Full width button */
  fullWidth?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Icon to show before text */
  icon?: ReactNode;
  /** Additional inline styles */
  style?: CSSProperties;
}

const sizeMap = {
  sm: {
    paddingX: spacing.md,
    paddingY: spacing.xs,
    fontSize: typography.fontSize.sm,
    minHeight: '32px',
  },
  md: {
    paddingX: spacing.lg,
    paddingY: spacing.sm,
    fontSize: typography.fontSize.base,
    minHeight: '40px',
  },
  lg: {
    paddingX: spacing.xl,
    paddingY: spacing.md,
    fontSize: typography.fontSize.md,
    minHeight: '48px',
  },
} as const;

const variantStyles = {
  primary: {
    base: {
      background: colors.accent.primary,
      color: '#ffffff',
      border: 'none',
    },
    hover: {
      background: colors.accent.primaryHover,
    },
  },
  secondary: {
    base: {
      background: colors.surface.glass,
      color: colors.text.primary,
      border: `1px solid ${colors.border.medium}`,
      backdropFilter: 'blur(12px)',
    },
    hover: {
      background: colors.surface.glassStrong,
      borderColor: colors.border.strong,
    },
  },
  ghost: {
    base: {
      background: 'transparent',
      color: colors.text.primary,
      border: '1px solid transparent',
    },
    hover: {
      background: colors.accent.primaryMuted,
      color: colors.accent.primary,
    },
  },
} as const;

/**
 * Button - Interactive button component
 *
 * Supports primary (gold), secondary (glass), and ghost variants.
 * Pill-shaped with smooth hover transitions.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const sizeStyles = sizeMap[size];
  const variantStyle = variantStyles[variant];

  const buttonStyle: CSSProperties = {
    // Reset
    appearance: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    outline: 'none',

    // Layout
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: fullWidth ? '100%' : undefined,
    minHeight: sizeStyles.minHeight,
    padding: `${sizeStyles.paddingY} ${sizeStyles.paddingX}`,

    // Typography
    fontFamily: typography.fontFamily.sans,
    fontSize: sizeStyles.fontSize,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'none',

    // Visual
    borderRadius: radius.pill,
    transition: 'all 200ms ease',
    opacity: disabled || loading ? 0.6 : 1,

    // Variant base styles
    ...variantStyle.base,

    // Hover styles (when hovered and not disabled)
    ...(isHovered && !disabled && !loading ? variantStyle.hover : {}),

    // Custom styles
    ...style,
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={buttonStyle}
      onPointerDown={stopPropagation}
      onPointerMove={stopPropagation}
      onPointerUp={stopPropagation}
      onMouseEnter={(e) => {
        setIsHovered(true);
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        props.onMouseLeave?.(e);
      }}
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

/**
 * IconButton - Circular button for icons only
 */
export function IconButton({
  children,
  size = 'md',
  variant = 'ghost',
  'aria-label': ariaLabel,
  ...props
}: Omit<ButtonProps, 'fullWidth' | 'icon'> & { 'aria-label': string }) {
  const sizeMap = {
    sm: '32px',
    md: '40px',
    lg: '48px',
  };

  return (
    <Button
      variant={variant}
      size={size}
      aria-label={ariaLabel}
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        padding: 0,
        borderRadius: radius.pill,
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * Simple loading spinner
 */
function LoadingSpinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{
        animation: 'spin 1s linear infinite',
      }}
    >
      <title>Loading</title>
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="32"
        strokeDashoffset="12"
      />
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </svg>
  );
}
