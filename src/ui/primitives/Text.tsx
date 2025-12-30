import type { CSSProperties, ReactNode } from 'react';
import { colors } from '../tokens/colors';
import { type TextStyle, textStyles, typography } from '../tokens/typography';

export interface TextProps {
  children: ReactNode;
  /** Preset text style */
  variant?: TextStyle;
  /** Text color */
  color?: 'primary' | 'secondary' | 'dim' | 'accent' | 'inverse';
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Additional inline styles */
  style?: CSSProperties;
  /** CSS class name */
  className?: string;
  /** HTML element to render */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'label' | 'div';
  /** HTML id attribute */
  id?: string;
  /** HTML for attribute (for labels) */
  htmlFor?: string;
}

const colorMap = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  dim: colors.text.dim,
  accent: colors.text.accent,
  inverse: colors.text.inverse,
} as const;

// Map variant to semantic HTML element
const variantElementMap: Record<TextStyle, TextProps['as']> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  bodySmall: 'p',
  label: 'span',
  labelMd: 'span',
  accent: 'span',
  number: 'span',
  numberLarge: 'span',
};

/**
 * Text - Typography component with semantic variants
 *
 * Provides consistent text styling across the app.
 */
export function Text({
  children,
  variant = 'body',
  color = 'primary',
  align,
  style,
  className,
  as,
  id,
  htmlFor,
}: TextProps) {
  const presetStyle = textStyles[variant];
  const Component = as || variantElementMap[variant] || 'span';

  const textStyle: CSSProperties = {
    fontFamily: typography.fontFamily.sans,
    fontSize: presetStyle.fontSize,
    fontWeight: presetStyle.fontWeight,
    letterSpacing: presetStyle.letterSpacing,
    lineHeight: presetStyle.lineHeight,
    color: colorMap[color],
    textAlign: align,
    textTransform: 'textTransform' in presetStyle ? presetStyle.textTransform : undefined,
    fontVariantNumeric:
      'fontVariantNumeric' in presetStyle ? presetStyle.fontVariantNumeric : undefined,
    margin: 0,
    ...style,
  };

  // biome-ignore lint/suspicious/noExplicitAny: Component is a dynamic element type that may or may not support htmlFor
  const elementProps: any = { className, style: textStyle, id };
  if (Component === 'label' && htmlFor) {
    elementProps.htmlFor = htmlFor;
  }

  return <Component {...elementProps}>{children}</Component>;
}

/**
 * Label - Convenience wrapper for label text
 */
export function Label({
  children,
  size = 'sm',
  ...props
}: Omit<TextProps, 'variant'> & { size?: 'sm' | 'md' }) {
  return (
    <Text variant={size === 'sm' ? 'label' : 'labelMd'} color="secondary" {...props}>
      {children}
    </Text>
  );
}

/**
 * Heading - Convenience wrapper for headings
 */
export function Heading({
  children,
  level = 2,
  ...props
}: Omit<TextProps, 'variant'> & { level?: 1 | 2 | 3 }) {
  const variant = `h${level}` as TextStyle;
  return (
    <Text variant={variant} {...props}>
      {children}
    </Text>
  );
}
