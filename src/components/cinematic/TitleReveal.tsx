import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MOOD_IDS, MOOD_METADATA, type MoodId } from '../../constants';
import { MOOD_COLORS } from '../../styles/designTokens';
import type { IntroPhase } from './types';

interface TitleRevealProps {
  /** Current intro phase */
  phase: IntroPhase;
  /** Progress within current phase (0-1) */
  progress: number;
  /** Callback when user completes onboarding (after mood selection) */
  onJoin: (selectedMood?: MoodId) => void;
  /** Callback when user wants tutorial */
  onTutorial?: () => void;
  /** Callback when user wants to see About */
  onAbout?: () => void;
}

/**
 * Title reveal with "breathe together" text, CTAs, and mood selection.
 *
 * Flow:
 * - reveal phase: Title fades in on scene
 * - cta phase: CTAs appear (Join, Tutorial, About)
 * - Click Join → Mood selection modal animates in with GSAP
 * - After mood selection → onJoin is called
 */
export function TitleReveal({ phase, progress, onJoin, onTutorial, onAbout }: TitleRevealProps) {
  const [titleVisible, setTitleVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [ctaHovered, setCtaHovered] = useState<string | null>(null);
  const [showMoodSelect, setShowMoodSelect] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);

  // Refs for GSAP animations
  const modalOverlayRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const ctaButtonRef = useRef<HTMLButtonElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

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

  // GSAP animation for modal open
  useEffect(() => {
    if (showMoodSelect && modalOverlayRef.current && modalContentRef.current) {
      // Kill any existing animation
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      const tl = gsap.timeline();
      timelineRef.current = tl;

      // Get button position for origin animation
      const buttonRect = ctaButtonRef.current?.getBoundingClientRect();
      const viewportCenter = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };

      // Calculate starting position relative to viewport center
      const startX = buttonRect ? buttonRect.left + buttonRect.width / 2 - viewportCenter.x : 0;
      const startY = buttonRect ? buttonRect.top + buttonRect.height / 2 - viewportCenter.y : 50;

      // Animate overlay
      tl.fromTo(
        modalOverlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out' },
        0,
      );

      // Animate modal content from button position
      tl.fromTo(
        modalContentRef.current,
        {
          opacity: 0,
          scale: 0.8,
          y: startY,
          x: startX,
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          x: 0,
          duration: 0.5,
          ease: 'back.out(1.7)',
        },
        0.1,
      );

      // Stagger animate mood options
      const moodButtons = modalContentRef.current.querySelectorAll('.mood-option');
      tl.fromTo(
        moodButtons,
        { opacity: 0, y: 20, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.3,
          stagger: 0.05,
          ease: 'power2.out',
        },
        0.3,
      );
    }

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [showMoodSelect]);

  // GSAP animation for modal close
  const closeModal = useCallback((callback?: () => void) => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setShowMoodSelect(false);
        callback?.();
      },
    });

    if (modalContentRef.current) {
      tl.to(modalContentRef.current, {
        opacity: 0,
        scale: 0.95,
        y: 20,
        duration: 0.25,
        ease: 'power2.in',
      });
    }

    if (modalOverlayRef.current) {
      tl.to(
        modalOverlayRef.current,
        {
          opacity: 0,
          duration: 0.2,
          ease: 'power2.in',
        },
        0.1,
      );
    }
  }, []);

  // Handle CTA click - open mood selection
  const handleJoinClick = useCallback(() => {
    setShowMoodSelect(true);
  }, []);

  // Handle mood selection
  const handleMoodSelect = useCallback(
    (mood: MoodId) => {
      setSelectedMood(mood);
      // Store mood in localStorage so SimpleGaiaUI doesn't show welcome modal again
      localStorage.setItem('breathe-together-selected-mood', mood);
      // Brief delay to show selection, then close with animation
      setTimeout(() => {
        closeModal(() => onJoin(mood));
      }, 200);
    },
    [onJoin, closeModal],
  );

  // Handle skip mood selection
  const handleSkipMood = useCallback(() => {
    closeModal(() => onJoin(undefined));
  }, [onJoin, closeModal]);

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

      {/* CTA Buttons - only during cta phase, hidden when modal is open */}
      {phase === 'cta' && !showMoodSelect && (
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
            ref={ctaButtonRef}
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
              First Time? Start Tutorial
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
      {phase === 'cta' && !showMoodSelect && (
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

      {/* Mood Selection Modal - GSAP animated */}
      {showMoodSelect && (
        <div
          ref={modalOverlayRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mood-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            opacity: 0, // GSAP will animate this
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleSkipMood();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleSkipMood();
            }
          }}
        >
          <div
            ref={modalContentRef}
            style={{
              background: 'rgba(253, 251, 247, 0.92)',
              backdropFilter: 'blur(40px)',
              borderRadius: '32px',
              border: '1px solid rgba(160, 140, 120, 0.15)',
              padding: '40px 36px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.12)',
              opacity: 0, // GSAP will animate this
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2
                id="mood-modal-title"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: '1.75rem',
                  fontWeight: 400,
                  margin: '0 0 8px 0',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#4a3f35',
                }}
              >
                How are you?
              </h2>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: '#8b7a6a',
                  margin: 0,
                  lineHeight: 1.5,
                  letterSpacing: '0.02em',
                }}
              >
                Your presence joins others in the breathing space
              </p>
            </div>

            {/* Mood Options */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {MOOD_IDS.map((moodId) => {
                const metadata = MOOD_METADATA[moodId];
                const color = MOOD_COLORS[moodId] ?? '#9a8a7a';
                const isSelected = selectedMood === moodId;

                return (
                  <button
                    key={moodId}
                    type="button"
                    className="mood-option"
                    onClick={() => handleMoodSelect(moodId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '18px 22px',
                      background: isSelected
                        ? `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`
                        : 'rgba(255, 255, 255, 0.5)',
                      borderRadius: '18px',
                      border: isSelected
                        ? `2px solid ${color}50`
                        : '2px solid rgba(255, 255, 255, 0.4)',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      textAlign: 'left',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: isSelected
                        ? `0 4px 20px ${color}25, 0 0 0 1px ${color}15`
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                      opacity: 0, // GSAP will animate this
                    }}
                  >
                    {/* Color indicator */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${color}80, ${color})`,
                        boxShadow: isSelected ? `0 0 20px ${color}60` : `0 2px 8px ${color}30`,
                        transition: 'all 0.3s ease',
                      }}
                    />

                    {/* Text content */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#3d3229' : '#5a4d42',
                          letterSpacing: '0.03em',
                          marginBottom: '2px',
                        }}
                      >
                        {metadata.label}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: isSelected ? '#6a5d52' : '#9a8a7a',
                          letterSpacing: '0.02em',
                          fontStyle: 'italic',
                        }}
                      >
                        {metadata.description}
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: color,
                          boxShadow: `0 0 8px ${color}80`,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Skip Button */}
            <button
              type="button"
              onClick={handleSkipMood}
              style={{
                background: 'transparent',
                color: '#9a8a7a',
                border: 'none',
                padding: '14px',
                fontSize: '0.68rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                width: '100%',
                marginTop: '16px',
                opacity: 0.8,
                transition: 'opacity 0.2s ease',
              }}
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
