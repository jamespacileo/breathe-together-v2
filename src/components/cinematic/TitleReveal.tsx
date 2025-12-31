import { useEffect, useState } from 'react';
import type { IntroPhase } from './types';

interface TitleRevealProps {
  /** Current intro phase */
  phase: IntroPhase;
  /** Callback when user clicks the CTA */
  onJoin: () => void;
}

/**
 * Title reveal with "breathe together" text and CTA button.
 *
 * Phases:
 * - title: "breathe" fades in, then "together" below
 * - cta: Button appears to join the breathing sphere
 */
export function TitleReveal({ phase, onJoin }: TitleRevealProps) {
  const [breatheVisible, setBreatheVisible] = useState(false);
  const [togetherVisible, setTogetherVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);

  // Stagger text appearance during title phase
  useEffect(() => {
    if (phase === 'title') {
      // "breathe" appears immediately
      const breatheTimer = setTimeout(() => setBreatheVisible(true), 100);
      // "together" appears after 1.5s
      const togetherTimer = setTimeout(() => setTogetherVisible(true), 1500);

      return () => {
        clearTimeout(breatheTimer);
        clearTimeout(togetherTimer);
      };
    }

    if (phase === 'cta') {
      // CTA button appears after a brief pause
      const ctaTimer = setTimeout(() => setCtaVisible(true), 500);
      return () => clearTimeout(ctaTimer);
    }

    if (phase === 'complete') {
      // Fade everything out
      setBreatheVisible(false);
      setTogetherVisible(false);
      setCtaVisible(false);
    }
  }, [phase]);

  // Don't render during early phases
  if (phase === 'void' || phase === 'glow' || phase === 'reveal') {
    return null;
  }

  // Shared text styles
  const textBase: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontWeight: 300,
    letterSpacing: '0.25em',
    textTransform: 'lowercase',
    margin: 0,
    textShadow: '0 2px 40px rgba(255, 250, 240, 0.3)',
    transition: 'opacity 1.5s ease-out, transform 1.5s ease-out',
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
        background:
          phase === 'complete'
            ? 'transparent'
            : 'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, transparent 70%)',
        transition: 'background 1s ease-out',
      }}
    >
      {/* Main title: "breathe" */}
      <h1
        style={{
          ...textBase,
          fontSize: 'clamp(2.5rem, 10vw, 6rem)',
          color: '#f8f4ed',
          opacity: breatheVisible ? 1 : 0,
          transform: breatheVisible ? 'translateY(0)' : 'translateY(20px)',
        }}
      >
        breathe
      </h1>

      {/* Subtitle: "together" */}
      <h2
        style={{
          ...textBase,
          fontSize: 'clamp(1.2rem, 5vw, 3rem)',
          color: '#d4ccc0',
          marginTop: '0.3em',
          opacity: togetherVisible ? 1 : 0,
          transform: togetherVisible ? 'translateY(0)' : 'translateY(15px)',
        }}
      >
        together
      </h2>

      {/* CTA Button */}
      {phase === 'cta' && (
        <button
          type="button"
          onClick={onJoin}
          onMouseEnter={() => setCtaHovered(true)}
          onMouseLeave={() => setCtaHovered(false)}
          onFocus={() => setCtaHovered(true)}
          onBlur={() => setCtaHovered(false)}
          style={{
            marginTop: 'clamp(2rem, 6vh, 4rem)',
            padding: '16px 48px',
            background: ctaHovered ? 'rgba(255, 250, 240, 0.2)' : 'rgba(255, 250, 240, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 250, 240, 0.3)',
            borderRadius: '40px',
            color: '#f8f4ed',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 'clamp(0.8rem, 2vw, 1rem)',
            fontWeight: 500,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible
              ? ctaHovered
                ? 'translateY(0) scale(1.02)'
                : 'translateY(0) scale(1)'
              : 'translateY(20px) scale(0.95)',
            transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: ctaHovered
              ? '0 8px 32px rgba(255, 250, 240, 0.15), inset 0 0 20px rgba(255, 250, 240, 0.05)'
              : '0 4px 24px rgba(0, 0, 0, 0.1)',
          }}
        >
          Join the Sphere
        </button>
      )}

      {/* Subtle hint text below CTA */}
      {phase === 'cta' && ctaVisible && (
        <p
          style={{
            marginTop: '1.5rem',
            fontSize: 'clamp(0.65rem, 1.5vw, 0.8rem)',
            color: 'rgba(212, 204, 192, 0.6)',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            letterSpacing: '0.1em',
            opacity: ctaVisible ? 1 : 0,
            transition: 'opacity 1s ease-out 0.3s',
          }}
        >
          synchronize your breath with the world
        </p>
      )}
    </div>
  );
}
