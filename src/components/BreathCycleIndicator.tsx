import { memo, useCallback, useEffect, useRef } from 'react';
import { BREATH_TOTAL_CYCLE } from '../constants';
import { calculatePhaseInfo } from '../lib/breathPhase';
import { UI_COLORS } from '../styles/designTokens';

/**
 * BreathCycleIndicator - Minimal 4·7·8 breathing rhythm display
 *
 * A master-crafted micro-detail showing the 4-7-8 breathing pattern.
 * The active duration gently glows, creating a subtle but informative
 * visual cue for the current breathing phase.
 *
 * Design Notes:
 * - Uses oldstyle/tabular numerals for refined typographic feel
 * - Interpunct separators (·) rather than slashes for elegance
 * - Active phase gets warm gold glow, inactive phases recede
 * - Subtle scale micro-animation on phase transitions
 * - No React state - all updates via RAF for 60fps smoothness
 *
 * Breathing Phases:
 * - 4 = Inhale (phaseIndex 0) - 4 seconds
 * - 7 = Hold (phaseIndex 1) - 7 seconds
 * - 8 = Exhale (phaseIndex 2) - 8 seconds
 */
function BreathCycleIndicatorComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const number4Ref = useRef<HTMLSpanElement>(null);
  const number7Ref = useRef<HTMLSpanElement>(null);
  const number8Ref = useRef<HTMLSpanElement>(null);
  const dot1Ref = useRef<HTMLSpanElement>(null);
  const dot2Ref = useRef<HTMLSpanElement>(null);
  const prevPhaseRef = useRef(-1);

  // Design tokens
  const activeColor = UI_COLORS.accent.gold;
  const inactiveColor = UI_COLORS.text.dim;
  const glowColor = UI_COLORS.accent.goldGlow;

  // Memoize helper functions to prevent recreation on each render
  const updateNumber = useCallback(
    (el: HTMLSpanElement, isActive: boolean, phaseProgress: number) => {
      if (isActive) {
        el.style.color = activeColor;
        el.style.textShadow = `0 0 12px ${glowColor}, 0 0 24px ${glowColor}`;
        el.style.opacity = '1';
        // Subtle scale pulse at start of phase
        const pulse =
          phaseProgress < 0.15 ? 1 + Math.sin((phaseProgress * Math.PI) / 0.15) * 0.08 : 1;
        el.style.transform = `scale(${pulse})`;
      } else {
        el.style.color = inactiveColor;
        el.style.textShadow = 'none';
        el.style.opacity = '0.55';
        el.style.transform = 'scale(1)';
      }
    },
    [activeColor, inactiveColor, glowColor],
  );

  // Memoize dot update helper
  const updateDot = useCallback(
    (el: HTMLSpanElement, isTransitioning: boolean) => {
      el.style.color = isTransitioning ? activeColor : inactiveColor;
      el.style.opacity = isTransitioning ? '0.8' : '0.35';
    },
    [activeColor, inactiveColor],
  );

  // Store callbacks in refs to avoid RAF loop restarts when callbacks recreate
  const updateNumberRef = useRef(updateNumber);
  const updateDotRef = useRef(updateDot);
  updateNumberRef.current = updateNumber;
  updateDotRef.current = updateDot;

  useEffect(() => {
    let animationId: number;

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: RAF animation loop requires multiple DOM ref updates per frame - refactoring would reduce readability
    const updateIndicator = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex, phaseProgress } = calculatePhaseInfo(cycleTime);

      // Update each number's appearance based on active phase
      if (number4Ref.current)
        updateNumberRef.current(number4Ref.current, phaseIndex === 0, phaseProgress);
      if (number7Ref.current)
        updateNumberRef.current(number7Ref.current, phaseIndex === 1, phaseProgress);
      if (number8Ref.current)
        updateNumberRef.current(number8Ref.current, phaseIndex === 2, phaseProgress);

      // Update dots - glow when adjacent phases are transitioning
      if (dot1Ref.current) {
        const transitioning1 =
          (phaseIndex === 0 && phaseProgress > 0.85) || (phaseIndex === 1 && phaseProgress < 0.15);
        updateDotRef.current(dot1Ref.current, transitioning1);
      }
      if (dot2Ref.current) {
        const transitioning2 =
          (phaseIndex === 1 && phaseProgress > 0.85) || (phaseIndex === 2 && phaseProgress < 0.15);
        updateDotRef.current(dot2Ref.current, transitioning2);
      }

      prevPhaseRef.current = phaseIndex;
      animationId = requestAnimationFrame(updateIndicator);
    };

    updateIndicator();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Base styles for numbers
  const numberStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: '0.7rem',
    fontWeight: 500,
    fontFeatureSettings: '"tnum" 1, "onum" 1', // Tabular oldstyle numerals
    letterSpacing: '0.02em',
    transition: 'color 0.4s ease, text-shadow 0.4s ease, opacity 0.4s ease, transform 0.2s ease',
    color: inactiveColor,
    opacity: 0.55,
    display: 'inline-block',
    willChange: 'transform, opacity, color, text-shadow',
  };

  // Interpunct dot style
  const dotStyle: React.CSSProperties = {
    fontSize: '0.5rem',
    padding: '0 6px',
    color: inactiveColor,
    opacity: 0.35,
    transition: 'color 0.3s ease, opacity 0.3s ease',
    verticalAlign: 'middle',
    userSelect: 'none',
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 14px',
        background: 'rgba(252, 250, 246, 0.3)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(160, 140, 120, 0.08)',
        userSelect: 'none',
      }}
      title="4-7-8 Relaxation Breathing: 4s inhale · 7s hold · 8s exhale"
    >
      <span ref={number4Ref} style={numberStyle}>
        4
      </span>
      <span ref={dot1Ref} style={dotStyle}>
        ·
      </span>
      <span ref={number7Ref} style={numberStyle}>
        7
      </span>
      <span ref={dot2Ref} style={dotStyle}>
        ·
      </span>
      <span ref={number8Ref} style={numberStyle}>
        8
      </span>
    </div>
  );
}

// Wrap with React.memo to prevent unnecessary re-renders
export const BreathCycleIndicator = memo(BreathCycleIndicatorComponent);
