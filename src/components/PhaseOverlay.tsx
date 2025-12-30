import { useEffect, useRef } from 'react';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';
import { useViewport } from '../hooks/useViewport';

// Phase configuration
const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;
const PHASE_DURATIONS = [
  BREATH_PHASES.INHALE,
  BREATH_PHASES.HOLD_IN,
  BREATH_PHASES.EXHALE,
  BREATH_PHASES.HOLD_OUT,
];

interface PhaseInfo {
  phaseIndex: number;
  phaseProgress: number;
  accumulatedTime: number;
  phaseDuration: number;
}

/**
 * Calculate current breathing phase from cycle time
 */
function calculatePhaseInfo(cycleTime: number): PhaseInfo {
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

  return { phaseIndex, phaseProgress, accumulatedTime, phaseDuration };
}

interface PhaseOverlayProps {
  /** Whether the overlay is visible */
  visible?: boolean;
}

/**
 * PhaseOverlay - Elegant centered phase indicator with creative circular countdown
 *
 * Design:
 * - Phase name in large, ethereal Cormorant Garamond typography
 * - Subtle SVG circular arc that fills as progress advances
 * - Small countdown number elegantly integrated
 * - Floats elegantly over the globe
 *
 * Performance: Uses RAF loop with direct DOM/SVG updates (no React state for animation)
 */
export function PhaseOverlay({ visible = true }: PhaseOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phaseNameRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const progressArcRef = useRef<SVGCircleElement>(null);
  const presenceCountRef = useRef<HTMLSpanElement>(null);

  const { isMobile, isTablet } = useViewport();

  // Responsive sizing
  const ringSize = isMobile ? 120 : isTablet ? 140 : 160;
  const ringStrokeWidth = isMobile ? 1.5 : 2;
  const ringRadius = (ringSize - ringStrokeWidth * 2) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;

  // Phase indicator RAF loop (60fps updates without React state)
  useEffect(() => {
    let animationId: number;
    let prevPhase = -1;

    const updatePhase = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex, phaseProgress, accumulatedTime, phaseDuration } =
        calculatePhaseInfo(cycleTime);
      const phaseTime = phaseProgress * phaseDuration;

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

      // Update circular progress arc
      if (progressArcRef.current) {
        const cycleProgress = (accumulatedTime + phaseTime) / BREATH_TOTAL_CYCLE;
        // SVG stroke-dashoffset: full circumference = empty, 0 = full
        const offset = ringCircumference * (1 - cycleProgress);
        progressArcRef.current.style.strokeDashoffset = `${offset}`;
      }

      animationId = requestAnimationFrame(updatePhase);
    };

    updatePhase();
    return () => cancelAnimationFrame(animationId);
  }, [ringCircumference]);

  // Presence count simulation - updates every 2 seconds with subtle variation
  useEffect(() => {
    const updatePresenceCount = () => {
      if (presenceCountRef.current) {
        const baseCount = 75;
        const variation = Math.floor(Math.random() * 10) - 5;
        presenceCountRef.current.textContent = `${baseCount + variation}`;
      }
    };

    updatePresenceCount();
    const intervalId = setInterval(updatePresenceCount, 2000);
    return () => clearInterval(intervalId);
  }, []);

  // Design tokens - warm palette matching SimpleGaiaUI
  const colors = {
    text: '#5a4d42',
    textDim: '#8b7a6a',
    textGlow: '#c4a882',
    accent: '#c9a06c',
    accentGlow: 'rgba(201, 160, 108, 0.5)',
    ringBg: 'rgba(160, 140, 120, 0.08)',
    ringFill: 'rgba(201, 160, 108, 0.6)',
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        opacity: visible ? 1 : 0,
        transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Circular Progress Ring with Phase Name Inside */}
      <div
        style={{
          position: 'relative',
          width: ringSize,
          height: ringSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* SVG Ring */}
        <svg
          width={ringSize}
          height={ringSize}
          role="img"
          aria-label="Breathing cycle progress indicator"
          style={{
            position: 'absolute',
            transform: 'rotate(-90deg)', // Start from top
          }}
        >
          <title>Breathing cycle progress</title>
          {/* Background ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            fill="none"
            stroke={colors.ringBg}
            strokeWidth={ringStrokeWidth}
          />
          {/* Progress arc */}
          <circle
            ref={progressArcRef}
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            fill="none"
            stroke={colors.ringFill}
            strokeWidth={ringStrokeWidth}
            strokeLinecap="round"
            strokeDasharray={ringCircumference}
            strokeDashoffset={ringCircumference}
            style={{
              transition: 'stroke-dashoffset 0.1s linear',
              filter: `drop-shadow(0 0 6px ${colors.accentGlow})`,
            }}
          />
        </svg>

        {/* Phase Name + Timer Inside Ring */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '2px' : '4px',
          }}
        >
          {/* Phase Name */}
          <span
            ref={phaseNameRef}
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: isMobile ? '1.1rem' : isTablet ? '1.2rem' : '1.35rem',
              fontWeight: 300,
              letterSpacing: isMobile ? '0.12em' : '0.15em',
              textTransform: 'uppercase',
              color: colors.text,
              textShadow: `0 2px 12px ${colors.accentGlow}, 0 1px 3px rgba(0, 0, 0, 0.08)`,
            }}
          >
            Inhale
          </span>

          {/* Timer - elegant small number */}
          <span
            ref={timerRef}
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: isMobile ? '0.85rem' : '0.95rem',
              fontWeight: 300,
              color: colors.textDim,
              opacity: 0.8,
              letterSpacing: '0.05em',
            }}
          >
            4
          </span>
        </div>
      </div>

      {/* Presence Count - Below the ring, very subtle */}
      <div
        style={{
          marginTop: isMobile ? '16px' : '24px',
          fontSize: isMobile ? '0.65rem' : '0.6rem',
          color: colors.textDim,
          opacity: 0.5,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <span ref={presenceCountRef}>75</span> breathing
      </div>
    </div>
  );
}
