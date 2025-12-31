/**
 * OnboardingSequence - Cinematic user onboarding flow after mood selection
 *
 * Orchestrates a carefully-timed sequence that:
 * 1. Fades out the mood modal gracefully
 * 2. Shows a welcome message with their selected mood
 * 3. Reveals their personal icosahedron ("This is you")
 * 4. Animates the icosahedron flying to its position around the globe
 *
 * Designed with game-dev sensibilities:
 * - Each moment gets time to land before the next begins
 * - Visual teaching without words where possible
 * - Clear identity connection ("this shape is you")
 * - Cinematic pacing with anticipation and payoff
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MoodId } from '../constants';
import { MOOD_METADATA } from '../constants';
import { useViewport } from '../hooks/useViewport';
import { MOOD_COLORS } from '../styles/designTokens';
import { CSSIcosahedron } from './CSSIcosahedron';

/**
 * Sequence phases - linear state machine
 * Each phase has specific timing and visual treatment
 */
type SequencePhase =
  | 'idle' // Not started, waiting for trigger
  | 'modal-exit' // Modal fading out (600ms)
  | 'pause' // Brief moment of clarity (500ms)
  | 'welcome-text' // "You've joined" message (holds 2.2s)
  | 'reveal-you' // Large icosahedron reveal (holds 2.8s)
  | 'fly-to-globe' // Animation to orbital position (1.4s)
  | 'complete'; // Done, cleanup

interface OnboardingSequenceProps {
  /** The mood the user selected */
  selectedMood: MoodId | null;
  /** Triggered when modal should start exiting */
  isTriggered: boolean;
  /** Called when the entire sequence completes */
  onComplete: () => void;
  /** Called when modal exit animation starts (to hide modal) */
  onModalExitStart?: () => void;
}

/**
 * Timing constants (ms) - tuned for cinematic pacing
 * Game dev rule: give each moment its time, don't rush
 */
const TIMING = {
  MODAL_EXIT: 600, // Gentle fade out
  PAUSE: 500, // Beat of anticipation
  WELCOME_ENTRANCE: 800, // Text fade in
  WELCOME_HOLD: 2200, // Let them read
  REVEAL_ENTRANCE: 1000, // Icosahedron scales in
  REVEAL_HOLD: 2800, // "This is you" moment
  FLY_DURATION: 1400, // Flight to orbital position
  CLEANUP: 200, // Final fade
} as const;

/**
 * Easing functions for smooth, organic motion
 */
const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutQuart = (t: number): number => 1 - (1 - t) ** 4;

/**
 * Quadratic bezier curve for smooth curved paths
 * P0 = start, P1 = control, P2 = end
 */
const quadraticBezier = (t: number, p0: number, p1: number, p2: number): number => {
  const oneMinusT = 1 - t;
  return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * t * p1 + t * t * p2;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: State machine component managing 7 sequential phases with phase-specific conditional rendering - complexity is inherent to cinematic sequence orchestration
function OnboardingSequenceComponent({
  selectedMood,
  isTriggered,
  onComplete,
  onModalExitStart,
}: OnboardingSequenceProps) {
  const [phase, setPhase] = useState<SequencePhase>('idle');
  const [phaseProgress, setPhaseProgress] = useState(0);

  // Animation refs
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const icosahedronRef = useRef<HTMLDivElement>(null);

  // Responsive
  const { isMobile, isTablet } = useViewport();

  // Get mood color
  const moodColor = selectedMood ? MOOD_COLORS[selectedMood] : '#9a8a7a';
  const moodLabel = selectedMood ? MOOD_METADATA[selectedMood].label : '';

  /**
   * Phase transition orchestrator
   * Each phase triggers the next after its duration
   */
  const advancePhase = useCallback((nextPhase: SequencePhase, delay: number) => {
    setTimeout(() => {
      setPhase(nextPhase);
      setPhaseProgress(0);
      startTimeRef.current = performance.now();
    }, delay);
  }, []);

  /**
   * Start the sequence when triggered
   */
  useEffect(() => {
    if (isTriggered && phase === 'idle' && selectedMood) {
      // Small delay to let mood selection visual feedback show
      setTimeout(() => {
        onModalExitStart?.();
        setPhase('modal-exit');
        startTimeRef.current = performance.now();
      }, 150);
    }
  }, [isTriggered, phase, selectedMood, onModalExitStart]);

  /**
   * Phase progression state machine
   */
  useEffect(() => {
    if (phase === 'idle') return;

    switch (phase) {
      case 'modal-exit':
        advancePhase('pause', TIMING.MODAL_EXIT);
        break;
      case 'pause':
        advancePhase('welcome-text', TIMING.PAUSE);
        break;
      case 'welcome-text':
        advancePhase('reveal-you', TIMING.WELCOME_ENTRANCE + TIMING.WELCOME_HOLD);
        break;
      case 'reveal-you':
        advancePhase('fly-to-globe', TIMING.REVEAL_ENTRANCE + TIMING.REVEAL_HOLD);
        break;
      case 'fly-to-globe':
        advancePhase('complete', TIMING.FLY_DURATION);
        break;
      case 'complete':
        setTimeout(() => {
          onComplete();
        }, TIMING.CLEANUP);
        break;
    }
  }, [phase, advancePhase, onComplete]);

  /**
   * RAF loop for fly-to-globe animation
   * Animates position, scale, and rotation
   * Uses raw progress - easing applied in flyAnimation calculation
   */
  useEffect(() => {
    if (phase !== 'fly-to-globe') return;

    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / TIMING.FLY_DURATION, 1);

      // Store raw progress - easing is applied in flyAnimation useMemo
      setPhaseProgress(progress);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  /**
   * Calculate fly-to-globe animation values
   * Uses quadratic bezier for a graceful curved arc
   * Start: center of screen, large
   * End: orbital position, small (joins the swarm)
   */
  const flyAnimation = useMemo(() => {
    if (phase !== 'fly-to-globe') return null;

    // Eased progress for smooth motion
    const easedProgress = easeInOutCubic(phaseProgress);

    // Start position (center, slightly above)
    const startX = 0;
    const startY = isMobile ? -20 : -40;
    const startScale = isMobile ? 3 : 4;

    // Control point for bezier curve (creates arc up and right)
    const controlX = isMobile ? 40 : 80;
    const controlY = isMobile ? -120 : -200; // Arc upward

    // End position (orbital position - top right area, above the globe)
    const endX = isMobile ? 80 : 140;
    const endY = isMobile ? -60 : -120;
    const endScale = 0.6; // Shrink to match swarm particle size

    // Bezier interpolation for curved path
    const x = quadraticBezier(easedProgress, startX, controlX, endX);
    const y = quadraticBezier(easedProgress, startY, controlY, endY);

    // Scale eases differently - faster at start, slower at end
    const scaleProgress = easeOutQuart(phaseProgress);
    const scale = startScale + (endScale - startScale) * scaleProgress;

    // Rotation during flight (3/4 turn)
    const rotation = phaseProgress * 270;

    // Fade out in final 25% of animation
    const opacity = phaseProgress > 0.75 ? 1 - (phaseProgress - 0.75) / 0.25 : 1;

    return { x, y, scale, opacity, rotation };
  }, [phase, phaseProgress, isMobile]);

  // Don't render anything if not active or complete
  if (phase === 'idle' || phase === 'complete') return null;

  return (
    <div
      className="onboarding-sequence"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        pointerEvents: phase === 'modal-exit' ? 'none' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop - soft fade */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            phase === 'modal-exit' || phase === 'pause'
              ? 'rgba(0, 0, 0, 0)'
              : 'rgba(0, 0, 0, 0.15)',
          backdropFilter: phase === 'pause' ? 'blur(0px)' : 'blur(8px)',
          transition: `all ${TIMING.PAUSE}ms ease-out`,
        }}
      />

      {/* Welcome Text Phase */}
      {(phase === 'welcome-text' || phase === 'reveal-you' || phase === 'fly-to-globe') && (
        <div
          className="welcome-container"
          style={{
            position: 'absolute',
            textAlign: 'center',
            opacity: phase === 'welcome-text' ? 1 : phase === 'reveal-you' ? 0.6 : 0,
            transform:
              phase === 'welcome-text'
                ? 'translateY(0) scale(1)'
                : phase === 'reveal-you'
                  ? 'translateY(-60px) scale(0.95)'
                  : 'translateY(-80px) scale(0.9)',
            transition: `all ${TIMING.WELCOME_ENTRANCE}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
            pointerEvents: 'none',
          }}
        >
          {/* Main welcome text */}
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: isMobile ? '1.6rem' : isTablet ? '1.8rem' : '2.2rem',
              fontWeight: 300,
              color: '#4a3f35',
              margin: 0,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: phase === 'welcome-text' ? 1 : 0,
              transform: phase === 'welcome-text' ? 'translateY(0)' : 'translateY(12px)',
              transition: `all ${TIMING.WELCOME_ENTRANCE}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
              transitionDelay: '100ms',
            }}
          >
            You've joined the breath
          </h2>

          {/* Mood indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '20px',
              opacity: phase === 'welcome-text' ? 1 : 0,
              transform: phase === 'welcome-text' ? 'translateY(0)' : 'translateY(12px)',
              transition: `all ${TIMING.WELCOME_ENTRANCE}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
              transitionDelay: '250ms',
            }}
          >
            <CSSIcosahedron color={moodColor} size={20} isActive glowIntensity={0.5} />
            <span
              style={{
                fontSize: '0.85rem',
                color: '#6a5d52',
                fontWeight: 500,
                letterSpacing: '0.05em',
              }}
            >
              {moodLabel}
            </span>
          </div>
        </div>
      )}

      {/* "This is You" Reveal Phase */}
      {(phase === 'reveal-you' || phase === 'fly-to-globe') && (
        <div
          ref={icosahedronRef}
          className="you-reveal"
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? '20px' : '28px',
            // Custom CSS variable for glow color
            // @ts-expect-error CSS custom properties
            '--glow-color': `${moodColor}80`,
            ...(phase === 'fly-to-globe' && flyAnimation
              ? {
                  transform: `translate(${flyAnimation.x}px, ${flyAnimation.y}px) scale(${flyAnimation.scale}) rotate(${flyAnimation.rotation}deg)`,
                  opacity: flyAnimation.opacity,
                }
              : {
                  transform: 'translateY(0) scale(1)',
                  opacity: 1,
                }),
            transition:
              phase === 'fly-to-globe' ? 'none' : `all ${TIMING.REVEAL_ENTRANCE}ms ease-out`,
          }}
        >
          {/* Large icosahedron - "This is you" with dramatic entrance */}
          <div
            className="icosahedron-reveal"
            style={{
              animation:
                phase === 'reveal-you'
                  ? 'onboardingReveal 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                  : 'none',
            }}
          >
            <CSSIcosahedron
              color={moodColor}
              size={isMobile ? 72 : 96}
              isActive
              animated
              glowIntensity={0.8}
            />
          </div>

          {/* "This is you" label - only during reveal, hidden during flight */}
          {phase === 'reveal-you' && (
            <div
              className="label-reveal"
              style={{
                textAlign: 'center',
                animation: 'onboardingLabelFade 0.6s ease-out 0.5s forwards',
                opacity: 0,
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? '0.65rem' : '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: '#8b7a6a',
                  marginBottom: '8px',
                }}
              >
                This is you
              </div>
              <div
                style={{
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  color: '#5a4d42',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                }}
              >
                Breathing with others
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const OnboardingSequence = memo(OnboardingSequenceComponent);
