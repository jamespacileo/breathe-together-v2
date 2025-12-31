import { useEffect, useRef } from 'react';
import { AMBIENT_MESSAGES, WELCOME_INTRO } from '../config/inspirationalSequences';
import { BREATH_TOTAL_CYCLE } from '../constants';
import { useViewport } from '../hooks/useViewport';
import { calculatePhaseInfo } from '../lib/breathPhase';
import { useInspirationalTextStore } from '../stores/inspirationalTextStore';
import { TYPOGRAPHY, UI_COLORS, Z_INDEX } from '../styles/designTokens';

/**
 * Breathing Phase Timeline:
 *
 * |-- Inhale (3s) --|-- Hold-in (5s) --|-- Exhale (5s) --|-- Hold-out (3s) --|
 * |   fade in 0→1   |   visible (1)    |  fade out 1→0   |   hidden (0)      |
 *
 * Text appears as user inhales, stays during hold, fades as they exhale.
 * Uses the same controlled breathing curve as the visual elements so the
 * text feels like it's being breathed in and out with the user.
 */

/**
 * Controlled breath curve with soft start/end and steady middle
 *
 * Creates organic controlled breathing feel with three sections:
 * 1. Soft start: Raised cosine ramp (velocity 0 → steady)
 * 2. Steady middle: Linear/constant velocity (controlled, even flow)
 * 3. Soft end: Raised cosine ramp (velocity steady → 0)
 *
 * The raised cosine provides C1-continuous transitions (smooth velocity)
 * while the linear middle creates the "steady controlled" breathing feel.
 *
 * @param t Progress 0-1
 * @param startRamp Fraction of time for start ramp (0.2-0.35)
 * @param endRamp Fraction of time for end ramp (0.2-0.35)
 */
function controlledBreathCurve(t: number, startRamp: number, endRamp: number): number {
  // Clamp input
  t = Math.max(0, Math.min(1, t));

  // Middle section starts after startRamp and ends before endRamp
  const middleEnd = 1 - endRamp;

  // Calculate steady velocity needed to cover remaining distance
  // Total distance = 1, ramps each cover (ramp * velocity / 2)
  // So: startRamp*v/2 + middleDuration*v + endRamp*v/2 = 1
  // v * (startRamp/2 + middleDuration + endRamp/2) = 1
  // v = 1 / (1 - startRamp/2 - endRamp/2)
  const middleVelocity = 1 / (1 - startRamp / 2 - endRamp / 2);

  // Height reached at end of start ramp
  const startRampHeight = (middleVelocity * startRamp) / 2;
  // Height at start of end ramp
  const endRampStart = 1 - (middleVelocity * endRamp) / 2;

  if (t <= startRamp) {
    // Raised cosine ramp-up: smooth acceleration from 0 to middleVelocity
    // Integral of (1 - cos(πx))/2 from 0 to x = x/2 - sin(πx)/(2π)
    const normalized = t / startRamp;
    const integral = normalized / 2 - Math.sin(Math.PI * normalized) / (2 * Math.PI);
    return middleVelocity * startRamp * integral;
  }
  if (t >= middleEnd) {
    // Raised cosine ramp-down: smooth deceleration from middleVelocity to 0
    const normalized = (t - middleEnd) / endRamp;
    const integral = normalized / 2 - Math.sin(Math.PI * normalized) / (2 * Math.PI);
    return endRampStart + middleVelocity * endRamp * integral;
  }
  // Linear middle: constant velocity for steady, controlled feel
  return startRampHeight + middleVelocity * (t - startRamp);
}

/**
 * Inhale easing: Delayed reveal that mirrors exhale timing
 *
 * Uses asymmetric ramps - the mirror of exhale:
 * - Extended soft start (30%): Text stays invisible longer
 * - Steady middle (50%): Controlled reveal catches up
 * - Quick soft end (20%): Arrives at full visibility
 *
 * This mirrors how exhale fades sooner - inhale reveals later,
 * creating the sense of words emerging with the breath.
 */
function easeInhale(t: number): number {
  // Mirror of exhale: longer start ramp delays the reveal
  return controlledBreathCurve(t, 0.3, 0.2);
}

/**
 * Exhale easing: Controlled, relaxing fade-out
 *
 * Uses asymmetric ramps for relaxation breathing:
 * - Soft start (20%): Text begins fading gently
 * - Steady middle (50%): Constant velocity, controlled fade
 * - Extended soft end (30%): Extra gentle fade-out for "letting go" feel
 *
 * The longer end ramp creates the sense of words being released with the breath.
 */
function easeExhale(t: number): number {
  // Asymmetric: shorter start ramp, longer end ramp for relaxed finish
  return controlledBreathCurve(t, 0.2, 0.3);
}

function calculateOpacity(phaseIndex: number, phaseProgress: number): number {
  switch (phaseIndex) {
    case 0: // Inhale - fade in with breathing curve
      return easeInhale(phaseProgress);
    case 1: // Hold-in - fully visible
      return 1;
    case 2: // Exhale - fade out with breathing curve
      return 1 - easeExhale(phaseProgress);
    case 3: // Hold-out - hidden
      return 0;
    default:
      return 0;
  }
}

/**
 * InspirationalText - Above & Beyond style inspirational messages
 *
 * Displays centered text above and below the breathing globe that
 * fades in during inhale and out during exhale. Creates a sense of
 * unity and collective consciousness.
 *
 * Messages are configured in: src/config/inspirationalMessages.ts
 * See that file for documentation on adding new messages.
 *
 * Performance: Uses RAF loop with direct DOM updates (no React state for animation)
 * Mobile Responsive: Reduces spacing and font size on mobile to maximize 3D scene visibility
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: RAF loop with phase calculations and multiple style conditions requires higher complexity
export function InspirationalText() {
  const topWrapperRef = useRef<HTMLDivElement>(null);
  const bottomWrapperRef = useRef<HTMLDivElement>(null);
  const prevPhaseRef = useRef(-1);
  const { isMobile, isTablet } = useViewport();

  // Get store state and actions
  const getCurrentMessage = useInspirationalTextStore((state) => state.getCurrentMessage);
  const advanceCycle = useInspirationalTextStore((state) => state.advanceCycle);
  const setAmbientPool = useInspirationalTextStore((state) => state.setAmbientPool);
  const enqueue = useInspirationalTextStore((state) => state.enqueue);
  const ambientPool = useInspirationalTextStore((state) => state.ambientPool);
  // Subscribe to both currentSequence AND ambientIndex to trigger re-renders
  const currentSequence = useInspirationalTextStore((state) => state.currentSequence);
  const ambientIndex = useInspirationalTextStore((state) => state.ambientIndex);

  // Initialize store on mount - set ambient pool and queue intro if first visit
  useEffect(() => {
    // Only initialize if ambient pool is empty (first mount)
    if (ambientPool.length === 0) {
      setAmbientPool(AMBIENT_MESSAGES);
      // Queue welcome intro - store handles playOnce logic
      enqueue(WELCOME_INTRO);
    }
  }, [ambientPool.length, setAmbientPool, enqueue]);

  // RAF loop for smooth opacity animation synchronized to breathing
  useEffect(() => {
    let animationId: number;

    const updateText = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex, phaseProgress } = calculatePhaseInfo(cycleTime);

      // Calculate opacity based on breathing phase
      const opacity = calculateOpacity(phaseIndex, phaseProgress);

      // Subtle scale animation for depth
      const scale = 0.96 + opacity * 0.04;

      // Apply opacity and scale to BOTH wrappers directly
      // This ensures backdrop-filter fades properly with the text
      const transform = `scale(${scale})`;
      const opacityStr = String(opacity);

      if (topWrapperRef.current) {
        topWrapperRef.current.style.opacity = opacityStr;
        topWrapperRef.current.style.transform = transform;
      }
      if (bottomWrapperRef.current) {
        bottomWrapperRef.current.style.opacity = opacityStr;
        bottomWrapperRef.current.style.transform = transform;
      }

      // Track cycle completion and advance queue
      if (phaseIndex === 0 && prevPhaseRef.current === 3) {
        advanceCycle();
      }
      prevPhaseRef.current = phaseIndex;

      animationId = requestAnimationFrame(updateText);
    };

    updateText();
    return () => cancelAnimationFrame(animationId);
  }, [advanceCycle]);

  // Get current message from store
  // Note: Re-renders when currentSequence or ambientIndex changes (subscribed above)
  const quote = getCurrentMessage() ?? { top: '', bottom: '' };

  // Suppress unused variable warnings - these subscriptions trigger re-renders
  void currentSequence;
  void ambientIndex;

  // Design tokens - using centralized values
  const colors = {
    text: UI_COLORS.text.primary,
    textGlow: UI_COLORS.accent.goldGlow,
    subtleGlow: UI_COLORS.utility.subtleGlow,
    backdropInner: UI_COLORS.surface.backdrop,
    backdropOuter: UI_COLORS.surface.backdropTransparent,
  };

  // Soft radial gradient backdrop for readability
  // Applied to each wrapper so backdrop-filter animates with opacity
  // Mobile: Reduced padding to maximize 3D scene visibility
  const textWrapperStyle: React.CSSProperties = {
    position: 'relative',
    padding: isMobile
      ? '10px 16px' // Mobile: Minimal padding to maximize text width
      : isTablet
        ? '16px 40px' // Tablet: Medium padding
        : 'clamp(20px, 4vw, 40px) clamp(40px, 10vw, 100px)', // Desktop: Original spacious padding
    // Soft elliptical gradient - fades smoothly to transparent
    background: `radial-gradient(
      ellipse 120% 100% at center,
      ${colors.backdropInner} 0%,
      ${colors.backdropOuter} 65%
    )`,
    // Gentle blur for dreamy/ethereal effect
    backdropFilter: 'blur(3px)',
    WebkitBackdropFilter: 'blur(3px)',
    borderRadius: isMobile ? '40px' : '100px',
    // Start hidden - RAF loop controls opacity
    opacity: 0,
    // On mobile, use more of the available width
    maxWidth: isMobile ? '90vw' : 'none',
    width: isMobile ? '90vw' : 'auto',
  };

  const textStyle: React.CSSProperties = {
    fontFamily: TYPOGRAPHY.fontFamily.serif,
    // Mobile: Dynamic viewport-based sizing to fill available width
    fontSize: isMobile
      ? 'clamp(1.5rem, 8vw, 2.6rem)' // Mobile: Slightly larger for impact
      : isTablet
        ? 'clamp(1.5rem, 5vw, 2.4rem)'
        : 'clamp(1.6rem, 3.5vw, 2.8rem)',
    fontWeight: isMobile ? 400 : 300, // Slightly bolder on mobile for readability
    letterSpacing: isMobile ? '0.06em' : '0.22em', // Much tighter on mobile
    textTransform: 'uppercase',
    color: colors.text,
    textShadow: isMobile
      ? `0 0 24px ${colors.subtleGlow}, 0 1px 3px rgba(0, 0, 0, 0.2)` // Tighter shadow on mobile
      : `0 0 30px ${colors.subtleGlow}, 0 0 60px ${colors.textGlow}, 0 2px 8px rgba(0, 0, 0, 0.15)`,
    textAlign: 'center',
    lineHeight: isMobile ? 1.1 : 1.2,
    userSelect: 'none',
    whiteSpace: isMobile ? 'nowrap' : 'normal',
    width: isMobile ? '100%' : 'auto',
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: Z_INDEX.overlay,
        // Mobile: Smaller gap to reduce vertical space usage and show more of 3D scene
        gap: isMobile ? 'min(30vh, 180px)' : isTablet ? 'min(34vh, 220px)' : 'min(38vh, 260px)',
        // Mobile: Use more horizontal space
        width: isMobile ? '100%' : 'auto',
        paddingLeft: isMobile ? '5vw' : 0,
        paddingRight: isMobile ? '5vw' : 0,
      }}
    >
      {/* Top text - above the globe */}
      <div
        ref={topWrapperRef}
        style={{
          ...textWrapperStyle,
          marginTop: isMobile ? '-2vh' : '-3vh', // Less offset on mobile
        }}
      >
        <div style={textStyle}>{quote.top}</div>
      </div>

      {/* Bottom text - below the globe */}
      <div
        ref={bottomWrapperRef}
        style={{
          ...textWrapperStyle,
          marginBottom: isMobile ? '-2vh' : '-3vh', // Less offset on mobile
        }}
      >
        <div style={textStyle}>{quote.bottom}</div>
      </div>
    </div>
  );
}
