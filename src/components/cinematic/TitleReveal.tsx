import { useEffect, useState } from 'react';
import type { IntroPhase } from './types';

interface TitleRevealProps {
  /** Current intro phase */
  phase: IntroPhase;
  /** Progress within current phase (0-1) */
  progress: number;
  /** Callback when user clicks the CTA */
  onJoin: () => void;
}

/**
 * Title reveal with "breathe together" text and CTA button.
 *
 * Flow:
 * - reveal phase: Title fades in on black background (light text)
 * - cta phase: Scene visible behind, CTA button appears
 */
export function TitleReveal({ phase, progress, onJoin }: TitleRevealProps) {
  const [titleVisible, setTitleVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);

  // Title appears during reveal phase
  useEffect(() => {
    if (phase === 'reveal' && progress > 0.2) {
      setTitleVisible(true);
    }
    if (phase === 'complete') {
      setTitleVisible(false);
      setCtaVisible(false);
    }
  }, [phase, progress]);

  // CTA appears during cta phase
  useEffect(() => {
    if (phase === 'cta') {
      const timer = setTimeout(() => setCtaVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Don't render during void phase
  if (phase === 'void') {
    return null;
  }

  // During reveal: light text on black. During cta: dark text on light background
  const isOnBlack = phase === 'reveal' && progress < 0.8;
  const titleColor = isOnBlack ? '#f8f4ed' : '#4a3f35';
  const subtitleColor = isOnBlack ? '#c8c0b8' : '#7a6b5a';
  const textShadow = isOnBlack
    ? '0 2px 40px rgba(0, 0, 0, 0.5)'
    : '0 2px 40px rgba(201, 160, 108, 0.3)';

  // Shared text styles
  const textBase: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontWeight: 300,
    letterSpacing: '0.25em',
    textTransform: 'lowercase',
    margin: 0,
    textShadow,
    transition: 'opacity 1s ease-out, transform 1s ease-out, color 0.8s ease-out',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: phase === 'cta' ? 'auto' : 'none',
        zIndex: 1500,
      }}
    >
      {/* Main title: "breathe" */}
      <h1
        style={{
          ...textBase,
          fontSize: 'clamp(2.5rem, 10vw, 5rem)',
          color: titleColor,
          opacity: titleVisible ? 1 : 0,
          transform: titleVisible ? 'translateY(0)' : 'translateY(20px)',
        }}
      >
        breathe
      </h1>

      {/* Subtitle: "together" */}
      <h2
        style={{
          ...textBase,
          fontSize: 'clamp(1.2rem, 5vw, 2.5rem)',
          color: subtitleColor,
          marginTop: '0.2em',
          opacity: titleVisible ? 1 : 0,
          transform: titleVisible ? 'translateY(0)' : 'translateY(15px)',
          transitionDelay: '0.15s',
        }}
      >
        together
      </h2>

      {/* CTA Button - only during cta phase */}
      {phase === 'cta' && (
        <button
          type="button"
          onClick={onJoin}
          onMouseEnter={() => setCtaHovered(true)}
          onMouseLeave={() => setCtaHovered(false)}
          onFocus={() => setCtaHovered(true)}
          onBlur={() => setCtaHovered(false)}
          style={{
            marginTop: 'clamp(2rem, 5vh, 3rem)',
            padding: '16px 40px',
            background: ctaHovered ? 'rgba(255, 252, 245, 0.95)' : 'rgba(255, 252, 245, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(201, 160, 108, 0.3)',
            borderRadius: '32px',
            color: '#4a3f35',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)',
            fontWeight: 500,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible
              ? ctaHovered
                ? 'translateY(0) scale(1.03)'
                : 'translateY(0) scale(1)'
              : 'translateY(15px) scale(0.95)',
            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: ctaHovered
              ? '0 12px 40px rgba(201, 160, 108, 0.25)'
              : '0 8px 32px rgba(138, 131, 124, 0.15)',
          }}
        >
          Join the Sphere
        </button>
      )}

      {/* Subtle hint text below CTA */}
      {phase === 'cta' && (
        <p
          style={{
            marginTop: '1.5rem',
            fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)',
            color: '#9a8a7a',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            letterSpacing: '0.1em',
            opacity: ctaVisible ? 0.7 : 0,
            transition: 'opacity 1s ease-out',
            transitionDelay: '0.2s',
          }}
        >
          synchronize your breath with the world
        </p>
      )}
    </div>
  );
}
