import { useEffect, useRef, useState } from 'react';
import { CYCLES_PER_MESSAGE, MESSAGES } from '../config/inspirationalMessages';
import { BREATH_TOTAL_CYCLE } from '../constants';
import { calculatePhaseInfo } from '../lib/breathPhase';
import { useViewport } from '../hooks/useViewport';

/**
 * Breathing Phase Timeline:
 *
 * |-- Inhale (3s) --|-- Hold-in (5s) --|-- Exhale (5s) --|-- Hold-out (3s) --|
 * |   fade in 0→1   |   visible (1)    |  fade out 1→0   |   hidden (0)      |
 *
 * Text appears as user inhales, stays during hold, fades as they exhale.
 */
function calculateOpacity(phaseIndex: number, phaseProgress: number): number {
  switch (phaseIndex) {
    case 0: // Inhale - fade in
      return easeOutQuad(phaseProgress);
    case 1: // Hold-in - fully visible
      return 1;
    case 2: // Exhale - fade out
      return 1 - easeInQuad(phaseProgress);
    case 3: // Hold-out - hidden
      return 0;
    default:
      return 0;
  }
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeInQuad(t: number): number {
  return t * t;
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
export function InspirationalText() {
  const topWrapperRef = useRef<HTMLDivElement>(null);
  const bottomWrapperRef = useRef<HTMLDivElement>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const cycleCountRef = useRef(0);
  const prevPhaseRef = useRef(-1);
  const { isMobile, isTablet } = useViewport();

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

      // Track cycle completion and rotate quotes
      if (phaseIndex === 0 && prevPhaseRef.current === 3) {
        cycleCountRef.current += 1;
        if (cycleCountRef.current >= CYCLES_PER_MESSAGE) {
          cycleCountRef.current = 0;
          setQuoteIndex((prev) => (prev + 1) % MESSAGES.length);
        }
      }
      prevPhaseRef.current = phaseIndex;

      animationId = requestAnimationFrame(updateText);
    };

    updateText();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const quote = MESSAGES[quoteIndex] ?? MESSAGES[0];

  // Design tokens matching GaiaUI warm palette
  const colors = {
    text: '#5a4d42',
    textGlow: 'rgba(201, 160, 108, 0.7)',
    subtleGlow: 'rgba(255, 252, 245, 0.95)',
    // Soft backdrop - warm cream with gentle opacity
    backdropInner: 'rgba(253, 251, 247, 0.4)',
    backdropOuter: 'rgba(253, 251, 247, 0)',
  };

  // Soft radial gradient backdrop for readability
  // Applied to each wrapper so backdrop-filter animates with opacity
  // Mobile: Reduced padding to maximize 3D scene visibility
  const textWrapperStyle: React.CSSProperties = {
    position: 'relative',
    padding: isMobile
      ? '12px 24px' // Mobile: Compact padding for more scene visibility
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
  };

  const textStyle: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    // Mobile: Smaller font to reduce vertical space usage
    fontSize: isMobile
      ? 'clamp(1.1rem, 5vw, 1.4rem)' // Mobile: Smaller, max 1.4rem
      : isTablet
        ? 'clamp(1.4rem, 4vw, 2rem)' // Tablet: Medium size
        : 'clamp(1.6rem, 3.5vw, 2.8rem)', // Desktop: Original large size
    fontWeight: 300,
    letterSpacing: isMobile ? '0.15em' : '0.22em', // Less spacing on mobile
    textTransform: 'uppercase',
    color: colors.text,
    textShadow: `
      0 0 25px ${colors.subtleGlow},
      0 0 50px ${colors.textGlow},
      0 1px 6px rgba(0, 0, 0, 0.1)
    `,
    textAlign: 'center',
    lineHeight: isMobile ? 1.15 : 1.2, // Tighter line height on mobile
    userSelect: 'none',
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
        zIndex: 50,
        // Mobile: Smaller gap to reduce vertical space usage and show more of 3D scene
        gap: isMobile ? 'min(30vh, 180px)' : isTablet ? 'min(34vh, 220px)' : 'min(38vh, 260px)',
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
