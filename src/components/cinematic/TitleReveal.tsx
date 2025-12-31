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
 * All elements appear together during the 'cta' phase (main menu state).
 */
export function TitleReveal({ phase, onJoin }: TitleRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);

  // Fade in when entering cta phase
  useEffect(() => {
    if (phase === 'cta') {
      // Small delay for smooth transition
      const timer = setTimeout(() => setIsVisible(true), 200);
      return () => clearTimeout(timer);
    }

    if (phase === 'complete') {
      setIsVisible(false);
    }
  }, [phase]);

  // Don't render during void or reveal phases
  if (phase === 'void' || phase === 'reveal') {
    return null;
  }

  // Shared text styles
  const textBase: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontWeight: 300,
    letterSpacing: '0.25em',
    textTransform: 'lowercase',
    margin: 0,
    textShadow: '0 2px 40px rgba(201, 160, 108, 0.3)',
    transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
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
          color: '#4a3f35',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
        }}
      >
        breathe
      </h1>

      {/* Subtitle: "together" */}
      <h2
        style={{
          ...textBase,
          fontSize: 'clamp(1.2rem, 5vw, 2.5rem)',
          color: '#7a6b5a',
          marginTop: '0.2em',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
          transitionDelay: '0.1s',
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
            opacity: isVisible ? 1 : 0,
            transform: isVisible
              ? ctaHovered
                ? 'translateY(0) scale(1.03)'
                : 'translateY(0) scale(1)'
              : 'translateY(15px) scale(0.95)',
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transitionDelay: isVisible ? '0.2s' : '0s',
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
            opacity: isVisible ? 0.7 : 0,
            transition: 'opacity 0.8s ease-out',
            transitionDelay: '0.3s',
          }}
        >
          synchronize your breath with the world
        </p>
      )}
    </div>
  );
}
