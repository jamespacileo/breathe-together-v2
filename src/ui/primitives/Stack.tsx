import type { CSSProperties, ReactNode } from 'react';
import { type SpacingToken, spacing } from '../tokens/spacing';

export interface StackProps {
  children: ReactNode;
  /** Stack direction */
  direction?: 'horizontal' | 'vertical';
  /** Gap between items */
  gap?: SpacingToken;
  /** Alignment on cross axis */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  /** Alignment on main axis */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /** Whether to wrap items */
  wrap?: boolean;
  /** Padding around the stack */
  padding?: SpacingToken;
  /** Full width */
  fullWidth?: boolean;
  /** Full height */
  fullHeight?: boolean;
  /** Additional inline styles */
  style?: CSSProperties;
  /** CSS class name */
  className?: string;
  /** HTML element to render */
  as?: 'div' | 'section' | 'nav' | 'header' | 'footer' | 'main' | 'aside';
}

const alignMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
} as const;

const justifyMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
} as const;

/**
 * Stack - Flexible layout component for arranging children
 *
 * A simple flexbox wrapper with convenient props.
 */
export function Stack({
  children,
  direction = 'vertical',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  padding,
  fullWidth = false,
  fullHeight = false,
  style,
  className,
  as: Component = 'div',
}: StackProps) {
  const stackStyle: CSSProperties = {
    display: 'flex',
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    gap: spacing[gap],
    alignItems: alignMap[align],
    justifyContent: justifyMap[justify],
    flexWrap: wrap ? 'wrap' : 'nowrap',
    padding: padding ? spacing[padding] : undefined,
    width: fullWidth ? '100%' : undefined,
    height: fullHeight ? '100%' : undefined,
    ...style,
  };

  return (
    <Component className={className} style={stackStyle}>
      {children}
    </Component>
  );
}

/**
 * HStack - Horizontal stack (convenience wrapper)
 */
export function HStack(props: Omit<StackProps, 'direction'>) {
  return <Stack direction="horizontal" {...props} />;
}

/**
 * VStack - Vertical stack (convenience wrapper)
 */
export function VStack(props: Omit<StackProps, 'direction'>) {
  return <Stack direction="vertical" {...props} />;
}

/**
 * Spacer - Flexible space that pushes siblings apart
 */
export function Spacer() {
  return <div style={{ flex: 1 }} />;
}

/**
 * Divider - Visual separator line
 */
export interface DividerProps {
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Color intensity */
  intensity?: 'subtle' | 'medium' | 'strong';
}

export function Divider({ orientation = 'horizontal', intensity = 'subtle' }: DividerProps) {
  const opacityMap = {
    subtle: 0.1,
    medium: 0.2,
    strong: 0.3,
  };

  const style: CSSProperties =
    orientation === 'horizontal'
      ? {
          width: '100%',
          height: '1px',
          background: `rgba(140, 123, 108, ${opacityMap[intensity]})`,
        }
      : {
          width: '1px',
          height: '100%',
          background: `rgba(140, 123, 108, ${opacityMap[intensity]})`,
        };

  return <div style={style} />;
}
