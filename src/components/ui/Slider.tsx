/**
 * Slider component built on Radix UI primitives
 * Styled to match the breathe-together design system
 */

import * as SliderPrimitive from '@radix-ui/react-slider';
import { forwardRef } from 'react';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  displayValue: string | number;
  className?: string;
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(
  ({ value, onValueChange, min, max, step, label, displayValue, className = '' }, ref) => {
    return (
      <div ref={ref} className={`block mb-3.5 ${className}`}>
        {/* Label row */}
        <div className="flex justify-between text-[0.72rem] font-medium tracking-[0.08em] text-warm-gray mb-2">
          <span className="font-[small-caps]">{label}</span>
          <span className="font-normal tabular-nums">{displayValue}</span>
        </div>

        {/* Slider */}
        <SliderPrimitive.Root
          className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
          value={[value]}
          onValueChange={([v]) => onValueChange(v)}
          min={min}
          max={max}
          step={step}
        >
          {/* Track */}
          <SliderPrimitive.Track className="relative grow rounded-full h-1.5 bg-border overflow-hidden">
            {/* Range (filled portion) */}
            <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-accent-gold/60 to-accent-gold" />
          </SliderPrimitive.Track>

          {/* Thumb */}
          <SliderPrimitive.Thumb
            className="block w-[18px] h-[18px] rounded-full
              bg-gradient-to-br from-accent-gold-light to-accent-gold
              border-2 border-white/30
              shadow-[0_2px_8px_rgba(201,160,108,0.4),0_1px_2px_rgba(0,0,0,0.1)]
              transition-all duration-200 ease-out
              hover:scale-110 hover:shadow-[0_4px_16px_rgba(201,160,108,0.6),0_2px_4px_rgba(0,0,0,0.15)]
              focus:outline-none focus:ring-2 focus:ring-accent-gold/40 focus:ring-offset-2 focus:ring-offset-warm-cream
              active:scale-95"
            aria-label={label}
          />
        </SliderPrimitive.Root>
      </div>
    );
  },
);

Slider.displayName = 'Slider';
