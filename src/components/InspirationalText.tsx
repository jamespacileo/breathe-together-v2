import { memo, useEffect, useRef } from 'react';
import { BREATH_TOTAL_CYCLE } from '../constants';
import { useInspirationText } from '../hooks/useInspirationText';
import { useViewport } from '../hooks/useViewport';
import { calculatePhaseInfo } from '../lib/breathPhase';
import { easeExhale, easeInhaleText } from '../lib/easing';
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
 *
 * Easing functions imported from src/lib/easing.ts (single source of truth)
 */

function calculateOpacity(phaseIndex: number, phaseProgress: number): number {
  switch (phaseIndex) {
    case 0: // Inhale - fade in with breathing curve (text variant with delayed reveal)
      return easeInhaleText(phaseProgress);
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
 * Messages are backend-driven and synchronized globally (UTC-based) so all
 * users see the same message at the same time, reinforcing unity and connection.
 *
 * Performance: Uses RAF loop with direct DOM updates (no React state for animation)
 * Mobile Responsive: Reduces spacing and font size on mobile to maximize 3D scene visibility
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: RAF loop with phase calculations and multiple style conditions requires higher complexity
function InspirationalTextComponent() {
  const topWrapperRef = useRef<HTMLDivElement>(null);
  const bottomWrapperRef = useRef<HTMLDivElement>(null);
  const prevPhaseRef = useRef(-1);
  const { isMobile, isTablet } = useViewport();

  // Fetch current inspiration message from backend
  const { message } = useInspirationText();

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

      prevPhaseRef.current = phaseIndex;

      animationId = requestAnimationFrame(updateText);
    };

    updateText();
    return () => cancelAnimationFrame(animationId);
  }, []); // Empty deps - RAF loop is independent of state

  // Format message for display
  const quote = message ? { top: message.top, bottom: message.bottom } : { top: '', bottom: '' };

  // Design tokens - using centralized values and CSS variables for dynamic mood colors
  const colors = {
    text: UI_COLORS.text.primary,
    textGlow:
      typeof document !== 'undefined'
        ? getComputedStyle(document.documentElement).getPropertyValue('--color-accent-glow').trim()
        : UI_COLORS.accent.defaultGlow,
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

// Wrap with React.memo to prevent unnecessary re-renders
export const InspirationalText = memo(InspirationalTextComponent);
