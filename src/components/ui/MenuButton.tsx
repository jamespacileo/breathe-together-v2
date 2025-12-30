/**
 * MenuButton Component
 * Reusable button with Gaia design system styling
 */

import { useState } from 'react';
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  transitions,
  typography,
} from '../../styles/designTokens';

export interface MenuButtonProps {
  /** Button text */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Full width button */
  fullWidth?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Icon to display before text */
  icon?: React.ReactNode;
}

export function MenuButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  icon,
}: MenuButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Size configurations
  const sizeStyles = {
    sm: {
      padding: `${spacing.sm} ${spacing.lg}`,
      fontSize: typography.fontSize.xs,
      borderRadius: borderRadius.lg,
    },
    md: {
      padding: `${spacing.md} ${spacing.xl}`,
      fontSize: typography.fontSize.sm,
      borderRadius: borderRadius.lg,
    },
    lg: {
      padding: `${spacing.lg} ${spacing['2xl']}`,
      fontSize: typography.fontSize.base,
      borderRadius: borderRadius.xl,
    },
  };

  // Variant configurations - complexity is acceptable for UI component with multiple variants and states
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Button variants require multiple conditional style combinations (variant × hover × pressed)
  const getVariantStyles = () => {
    const base = {
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: transitions.normal,
      fontFamily: typography.fontFamily,
      fontWeight: typography.fontWeight.medium,
      textTransform: 'uppercase' as const,
      letterSpacing: typography.letterSpacing.wide,
      border: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      width: fullWidth ? '100%' : 'auto',
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          background: isPressed
            ? colors.accentHover
            : isHovered
              ? colors.accentLight
              : colors.accent,
          color: '#fff',
          boxShadow: isHovered ? shadows.md : shadows.sm,
          transform: isPressed ? 'scale(0.98)' : isHovered ? 'scale(1.02)' : 'scale(1)',
        };
      case 'secondary':
        return {
          ...base,
          background: isHovered ? colors.glassLight : colors.glass,
          backdropFilter: 'blur(20px)',
          color: colors.text,
          border: `1px solid ${isHovered ? colors.accent : colors.border}`,
          boxShadow: isHovered ? shadows.md : shadows.sm,
          transform: isPressed ? 'scale(0.98)' : 'scale(1)',
        };
      case 'ghost':
        return {
          ...base,
          background: isHovered ? colors.glassLight : 'transparent',
          color: isHovered ? colors.accent : colors.text,
          transform: isPressed ? 'scale(0.98)' : 'scale(1)',
        };
      default:
        return base;
    }
  };

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      style={{
        ...getVariantStyles(),
        ...sizeStyles[size],
      }}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  );
}
