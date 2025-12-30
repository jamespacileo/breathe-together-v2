import { type ChangeEvent, type CSSProperties, type PointerEvent, useId } from 'react';
import { HStack, VStack } from '../primitives/Stack';
import { Label, Text } from '../primitives/Text';
import { colors } from '../tokens/colors';
import { radius, spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

/**
 * Stop pointer events from propagating to prevent 3D scene interaction
 */
const stopPropagation = (e: PointerEvent) => {
  e.stopPropagation();
};

export interface SliderProps {
  /** Current value */
  value: number;
  /** Called when value changes */
  onChange: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Label text */
  label?: string;
  /** Show current value */
  showValue?: boolean;
  /** Format value for display */
  formatValue?: (value: number) => string;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * Slider - Range input component
 *
 * Custom styled slider with label and value display.
 */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  formatValue = (v) => String(v),
  disabled = false,
  size = 'md',
}: SliderProps) {
  const id = useId();
  const trackHeight = size === 'sm' ? '4px' : '6px';
  const thumbSize = size === 'sm' ? '16px' : '20px';

  // Calculate fill percentage for gradient
  const fillPercent = ((value - min) / (max - min)) * 100;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const wrapperStyle: CSSProperties = {
    width: '100%',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : undefined,
  };

  const trackStyle: CSSProperties = {
    width: '100%',
    height: trackHeight,
    borderRadius: radius.pill,
    background: `linear-gradient(
      to right,
      ${colors.accent.primary} 0%,
      ${colors.accent.primary} ${fillPercent}%,
      ${colors.border.medium} ${fillPercent}%,
      ${colors.border.medium} 100%
    )`,
    position: 'relative',
  };

  const inputStyle: CSSProperties = {
    // Reset
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '100%',
    height: trackHeight,
    background: 'transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    margin: 0,
    position: 'absolute',
    top: 0,
    left: 0,
  };

  // CSS for thumb styling (injected as style tag)
  const thumbCSS = `
    #${CSS.escape(id)}::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: ${thumbSize};
      height: ${thumbSize};
      border-radius: 50%;
      background: ${colors.accent.primary};
      border: 2px solid white;
      box-shadow: 0 2px 8px ${colors.shadow.medium};
      cursor: ${disabled ? 'not-allowed' : 'grab'};
      transition: transform 150ms ease, box-shadow 150ms ease;
      margin-top: calc((${trackHeight} - ${thumbSize}) / 2);
    }
    #${CSS.escape(id)}::-webkit-slider-thumb:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px ${colors.shadow.strong};
    }
    #${CSS.escape(id)}::-webkit-slider-thumb:active {
      cursor: grabbing;
      transform: scale(0.95);
    }
    #${CSS.escape(id)}::-moz-range-thumb {
      width: ${thumbSize};
      height: ${thumbSize};
      border-radius: 50%;
      background: ${colors.accent.primary};
      border: 2px solid white;
      box-shadow: 0 2px 8px ${colors.shadow.medium};
      cursor: ${disabled ? 'not-allowed' : 'grab'};
    }
    #${CSS.escape(id)}::-moz-range-track {
      background: transparent;
    }
    #${CSS.escape(id)}:focus {
      outline: none;
    }
    #${CSS.escape(id)}:focus-visible::-webkit-slider-thumb {
      box-shadow: 0 0 0 3px ${colors.accent.primaryMuted}, 0 2px 8px ${colors.shadow.medium};
    }
  `;

  return (
    <VStack
      gap="xs"
      style={wrapperStyle}
      onPointerDown={stopPropagation}
      onPointerMove={stopPropagation}
      onPointerUp={stopPropagation}
    >
      {(label || showValue) && (
        <HStack justify="between" align="center">
          {label && <Label htmlFor={id}>{label}</Label>}
          {showValue && (
            <Text variant="accent" color="accent">
              {formatValue(value)}
            </Text>
          )}
        </HStack>
      )}

      <div style={trackStyle}>
        <style>{thumbCSS}</style>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          style={inputStyle}
          onPointerDown={stopPropagation}
          onPointerMove={stopPropagation}
          onPointerUp={stopPropagation}
        />
      </div>
    </VStack>
  );
}

/**
 * Toggle - On/off switch component
 */
export interface ToggleProps {
  /** Current state */
  checked: boolean;
  /** Called when state changes */
  onChange: (checked: boolean) => void;
  /** Label text */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function Toggle({ checked, onChange, label, disabled = false, size = 'md' }: ToggleProps) {
  const id = useId();
  const trackWidth = size === 'sm' ? '36px' : '44px';
  const trackHeight = size === 'sm' ? '20px' : '24px';
  const thumbSize = size === 'sm' ? '16px' : '20px';
  const thumbOffset = '2px';
  const thumbTravel = size === 'sm' ? '16px' : '20px';

  const wrapperStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.sm,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  const trackStyle: CSSProperties = {
    width: trackWidth,
    height: trackHeight,
    borderRadius: radius.pill,
    background: checked ? colors.accent.primary : colors.border.medium,
    transition: 'background 200ms ease',
    position: 'relative',
    flexShrink: 0,
  };

  const thumbStyle: CSSProperties = {
    width: thumbSize,
    height: thumbSize,
    borderRadius: '50%',
    background: 'white',
    boxShadow: `0 2px 4px ${colors.shadow.medium}`,
    position: 'absolute',
    top: thumbOffset,
    left: checked ? thumbTravel : thumbOffset,
    transition: 'left 200ms ease',
  };

  const inputStyle: CSSProperties = {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  };

  return (
    <label
      htmlFor={id}
      style={wrapperStyle}
      onPointerDown={stopPropagation}
      onPointerMove={stopPropagation}
      onPointerUp={stopPropagation}
    >
      <div style={trackStyle}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          style={inputStyle}
        />
        <div style={thumbStyle} />
      </div>
      {label && <Text variant="bodySmall">{label}</Text>}
    </label>
  );
}

/**
 * SegmentedControl - Tab-like selector
 */
export interface SegmentedControlProps<T extends string> {
  /** Available options */
  options: { value: T; label: string }[];
  /** Current selected value */
  value: T;
  /** Called when selection changes */
  onChange: (value: T) => void;
  /** Label text */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Full width */
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    width: fullWidth ? '100%' : undefined,
  };

  const trackStyle: CSSProperties = {
    display: 'flex',
    background: colors.border.subtle,
    borderRadius: radius.lg,
    padding: '2px',
    width: fullWidth ? '100%' : undefined,
  };

  const getSegmentStyle = (isSelected: boolean): CSSProperties => ({
    flex: fullWidth ? 1 : undefined,
    padding: `${spacing.xs} ${spacing.md}`,
    borderRadius: radius.md,
    background: isSelected ? colors.surface.glassSolid : 'transparent',
    boxShadow: isSelected ? `0 1px 3px ${colors.shadow.soft}` : 'none',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSize.sm,
    fontWeight: isSelected ? typography.fontWeight.medium : typography.fontWeight.normal,
    color: isSelected ? colors.text.primary : colors.text.secondary,
    transition: 'all 200ms ease',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div
      style={containerStyle}
      onPointerDown={stopPropagation}
      onPointerMove={stopPropagation}
      onPointerUp={stopPropagation}
    >
      {label && <Label>{label}</Label>}
      <div style={trackStyle}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            style={getSegmentStyle(value === option.value)}
            onPointerDown={stopPropagation}
            onPointerMove={stopPropagation}
            onPointerUp={stopPropagation}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
