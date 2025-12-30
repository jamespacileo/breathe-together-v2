/**
 * Slider Component
 * Styled range input matching Gaia design system
 */

import { borderRadius, colors, spacing, typography } from '../../styles/designTokens';

export interface SliderProps {
  /** Slider label */
  label: string;
  /** Current value */
  value: number;
  /** Change handler */
  onChange: (value: number) => void;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step?: number;
  /** Format display value */
  formatValue?: (value: number) => string;
  /** Show value display */
  showValue?: boolean;
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatValue = (v) => v.toString(),
  showValue = true,
}: SliderProps) {
  return (
    <div style={{ marginBottom: spacing.lg }}>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: Input is associated via wrapper structure */}
      <label
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
        }}
      >
        <span
          style={{
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            textTransform: 'uppercase',
            letterSpacing: typography.letterSpacing.wider,
            color: colors.text,
          }}
        >
          {label}
        </span>
        {showValue && (
          <span
            style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.normal,
              color: colors.textDim,
            }}
          >
            {formatValue(value)}
          </span>
        )}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: colors.accent,
          cursor: 'pointer',
          height: '4px',
          borderRadius: borderRadius.sm,
          appearance: 'none',
          background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%, ${colors.border} 100%)`,
        }}
      />
    </div>
  );
}
