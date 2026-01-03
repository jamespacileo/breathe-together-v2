import { useCallback, useEffect, useState } from 'react';
import type { MoodId } from '../../constants';
import type { IntroPhase } from './types';

interface TitleRevealProps {
  /** Current intro phase */
  phase: IntroPhase;
  /** Progress within current phase (0-1) */
  progress: number;
  /** Callback when user clicks Join */
  onJoin: (selectedMood?: MoodId) => void;
  /** Callback when user wants tutorial */
  onTutorial?: () => void;
  /** Callback when user wants to see About */
  onAbout?: () => void;
}

/**
 * Title reveal with "breathe together" text and CTAs.
 *
 * Flow:
 * - reveal phase: Title fades in on scene
 * - cta phase: CTAs appear (Join, Tutorial, About)
 * - Click Join → onJoin is called directly
 */
export function TitleReveal({ phase, progress, onJoin, onTutorial, onAbout }: TitleRevealProps) {
  const [titleVisible, setTitleVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [ctaHovered, setCtaHovered] = useState<string | null>(null);

  // Title appears during reveal phase (after brief black)
  useEffect(() => {
    if (phase === 'reveal' && progress > 0.15) {
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

  // Handle Join click - call onJoin directly (no mood selection)
  const handleJoinClick = useCallback(() => {
    onJoin();
  }, [onJoin]);

  // Handle tutorial click
  const handleTutorialClick = useCallback(() => {
    onTutorial?.();
  }, [onTutorial]);

  // Handle about click
  const handleAboutClick = useCallback(() => {
    onAbout?.();
  }, [onAbout]);

  // Dark text on visible globe background (no black screen)
  const titleColor = '#4a3f35';
  const subtitleColor = '#7a6b5a';
  const textShadow = '0 2px 40px rgba(201, 160, 108, 0.3)';

  // Shared text styles - longer transitions for elegant reveal
  const textBase: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontWeight: 300,
    letterSpacing: '0.25em',
    textTransform: 'lowercase',
    margin: 0,
    textShadow,
    transition: 'opacity 1.5s ease-out, transform 1.5s ease-out, color 1.2s ease-out',
  };

  // CTA button base styles
  const ctaButtonBase: React.CSSProperties = {
    padding: '16px 40px',
    backdropFilter: 'blur(20px)',
    borderRadius: '32px',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)',
    fontWeight: 500,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
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

      {/* CTA Buttons - only during cta phase */}
      {phase === 'cta' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            marginTop: 'clamp(2rem, 5vh, 3rem)',
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Primary CTA - Join the Sphere */}
          <button
            type="button"
            onClick={handleJoinClick}
            onMouseEnter={() => setCtaHovered('join')}
            onMouseLeave={() => setCtaHovered(null)}
            onFocus={() => setCtaHovered('join')}
            onBlur={() => setCtaHovered(null)}
            style={{
              ...ctaButtonBase,
              background:
                ctaHovered === 'join' ? 'rgba(255, 252, 245, 0.95)' : 'rgba(255, 252, 245, 0.85)',
              border: '1px solid rgba(201, 160, 108, 0.3)',
              color: '#4a3f35',
              transform: ctaHovered === 'join' ? 'scale(1.03)' : 'scale(1)',
              boxShadow:
                ctaHovered === 'join'
                  ? '0 12px 40px rgba(201, 160, 108, 0.25)'
                  : '0 8px 32px rgba(138, 131, 124, 0.15)',
            }}
          >
            Join the Sphere
          </button>

          {/* Secondary CTAs row */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              opacity: ctaVisible ? 1 : 0,
              transition: 'opacity 0.6s ease-out',
              transitionDelay: '0.15s',
            }}
          >
            {/* Tutorial CTA */}
            <button
              type="button"
              onClick={handleTutorialClick}
              onMouseEnter={() => setCtaHovered('tutorial')}
              onMouseLeave={() => setCtaHovered(null)}
              onFocus={() => setCtaHovered('tutorial')}
              onBlur={() => setCtaHovered(null)}
              style={{
                ...ctaButtonBase,
                padding: '12px 24px',
                background:
                  ctaHovered === 'tutorial'
                    ? 'rgba(255, 252, 245, 0.7)'
                    : 'rgba(255, 252, 245, 0.5)',
                border: '1px solid rgba(160, 140, 120, 0.2)',
                color: '#6a5a4a',
                fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)',
                transform: ctaHovered === 'tutorial' ? 'scale(1.02)' : 'scale(1)',
                boxShadow:
                  ctaHovered === 'tutorial'
                    ? '0 8px 24px rgba(138, 131, 124, 0.15)'
                    : '0 4px 16px rgba(138, 131, 124, 0.1)',
              }}
            >
              How It Works
            </button>

            {/* About CTA */}
            <button
              type="button"
              onClick={handleAboutClick}
              onMouseEnter={() => setCtaHovered('about')}
              onMouseLeave={() => setCtaHovered(null)}
              onFocus={() => setCtaHovered('about')}
              onBlur={() => setCtaHovered(null)}
              style={{
                ...ctaButtonBase,
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid rgba(160, 140, 120, 0.25)',
                color: ctaHovered === 'about' ? '#5a4a3a' : '#8a7a6a',
                fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)',
                transform: ctaHovered === 'about' ? 'scale(1.02)' : 'scale(1)',
                boxShadow: 'none',
              }}
            >
              About
            </button>
          </div>
        </div>
      )}

      {/* Subtle hint text below CTAs */}
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
            transitionDelay: '0.3s',
          }}
        >
          synchronize your breath with the world
        </p>
      )}
    </div>
  );
}
