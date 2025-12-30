import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../../constants';
import { animation, zIndex } from '../tokens';
import { colors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

// Phase configuration
const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;
const PHASE_DURATIONS = [
  BREATH_PHASES.INHALE,
  BREATH_PHASES.HOLD_IN,
  BREATH_PHASES.EXHALE,
  BREATH_PHASES.HOLD_OUT,
];

/**
 * Calculate current phase state from cycle time
 */
function calculatePhaseState(cycleTime: number) {
  let accumulatedTime = 0;
  let phaseIndex = 0;

  for (let i = 0; i < PHASE_DURATIONS.length; i++) {
    const duration = PHASE_DURATIONS[i] ?? 0;
    if (cycleTime < accumulatedTime + duration) {
      phaseIndex = i;
      break;
    }
    accumulatedTime += duration;
  }

  const phaseDuration = PHASE_DURATIONS[phaseIndex] ?? 1;
  const phaseTime = cycleTime - accumulatedTime;
  const phaseProgress = Math.min(1, Math.max(0, phaseTime / phaseDuration));
  const cycleProgress = (accumulatedTime + phaseTime) / BREATH_TOTAL_CYCLE;

  return { phaseIndex, phaseDuration, phaseProgress, cycleProgress };
}

export interface PhaseIndicatorProps {
  /** Auto-hide after inactivity */
  autoHide?: boolean;
  /** Inactivity timeout in ms */
  autoHideTimeout?: number;
}

/**
 * PhaseIndicator - Centered breathing phase display
 *
 * Shows current breathing phase (Inhale/Hold/Exhale) with countdown timer
 * and progress bar. Uses RAF loop for 60fps updates without React re-renders.
 */
export function PhaseIndicator({ autoHide = true, autoHideTimeout = 5000 }: PhaseIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);

  // Phase indicator refs for RAF updates (no React re-renders)
  const phaseNameRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setHasEntered(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Phase indicator RAF loop (60fps updates without React state)
  useEffect(() => {
    let animationId: number;
    let prevPhase = -1;

    const updatePhase = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex, phaseDuration, phaseProgress, cycleProgress } =
        calculatePhaseState(cycleTime);

      // Update phase name on transition
      if (phaseIndex !== prevPhase) {
        prevPhase = phaseIndex;
        if (phaseNameRef.current) {
          phaseNameRef.current.textContent = PHASE_NAMES[phaseIndex] ?? 'Breathe';
        }
      }

      // Update timer (countdown)
      if (timerRef.current) {
        const remaining = Math.ceil((1 - phaseProgress) * phaseDuration);
        timerRef.current.textContent = `${remaining}`;
      }

      // Update progress bar
      if (progressRef.current) {
        progressRef.current.style.width = `${cycleProgress * 100}%`;
      }

      animationId = requestAnimationFrame(updatePhase);
    };

    updatePhase();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Auto-hide on inactivity
  useEffect(() => {
    if (!autoHide) return;

    let timeout: NodeJS.Timeout;

    const resetInactivity = () => {
      setIsVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsVisible(false), autoHideTimeout);
    };

    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('mousedown', resetInactivity);
    window.addEventListener('keydown', resetInactivity);
    window.addEventListener('touchstart', resetInactivity);

    resetInactivity();

    return () => {
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('mousedown', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      window.removeEventListener('touchstart', resetInactivity);
      clearTimeout(timeout);
    };
  }, [autoHide, autoHideTimeout]);

  const containerStyle: CSSProperties = {
    position: 'fixed',
    bottom: spacing.xl,
    left: '50%',
    transform: `translateX(-50%) translateY(${hasEntered ? 0 : 16}px)`,
    zIndex: zIndex.dropdown,
    opacity: hasEntered && isVisible ? 0.9 : 0,
    transition: `all ${animation.duration.slower} ${animation.easing.easeInOut}`,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
  };

  const phaseNameStyle: CSSProperties = {
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.light,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase',
    color: colors.text.primary,
    textShadow: `0 1px 12px ${colors.accent.primaryMuted}`,
  };

  const timerStyle: CSSProperties = {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.light,
    color: colors.text.secondary,
    minWidth: '1em',
    textAlign: 'center',
    opacity: 0.8,
  };

  const progressContainerStyle: CSSProperties = {
    width: '100px',
    height: '2px',
    background: colors.border.subtle,
    borderRadius: '1px',
    overflow: 'hidden',
    boxShadow: `0 0 8px ${colors.accent.primaryMuted}`,
  };

  const progressBarStyle: CSSProperties = {
    height: '100%',
    width: '0%',
    background: `linear-gradient(90deg, ${colors.accent.primary}, ${colors.text.secondary})`,
    borderRadius: '1px',
    transition: 'width 0.08s linear',
  };

  return (
    <output style={containerStyle} aria-label="Breathing phase indicator">
      {/* Phase Name + Timer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: spacing.sm,
        }}
      >
        <span ref={phaseNameRef} style={phaseNameStyle} aria-live="polite">
          Inhale
        </span>
        <span ref={timerRef} style={timerStyle} aria-hidden="true">
          4
        </span>
      </div>

      {/* Progress Bar */}
      <div style={progressContainerStyle} role="progressbar" aria-label="Breathing cycle progress">
        <div ref={progressRef} style={progressBarStyle} />
      </div>
    </output>
  );
}
