import { useCallback, useEffect, useState } from 'react';
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
}

/**
 * Title reveal with "breathe together" text, CTA button, and mood selection.
 *
 * Flow:
 * - reveal phase: Title fades in on black background (light text)
 * - cta phase: Scene visible behind, CTA button appears
 * - Click CTA → Mood selection modal appears
 * - After mood selection → onJoin is called
 */
export function TitleReveal({ phase, progress, onJoin }: TitleRevealProps) {
  const [titleVisible, setTitleVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const [showMoodSelect, setShowMoodSelect] = useState(false);
  const [moodSelectAnimated, setMoodSelectAnimated] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);

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

  // Animate mood select modal
  useEffect(() => {
    if (showMoodSelect) {
      const timer = setTimeout(() => setMoodSelectAnimated(true), 10);
      return () => clearTimeout(timer);
    }
    setMoodSelectAnimated(false);
  }, [showMoodSelect]);

  // Handle CTA click - open mood selection
  const handleCtaClick = useCallback(() => {
    setShowMoodSelect(true);
  }, []);

  // Handle mood selection
  const handleMoodSelect = useCallback(
    (mood: MoodId) => {
      setSelectedMood(mood);
      // Brief delay to show selection, then join
      setTimeout(() => {
        setShowMoodSelect(false);
        onJoin(mood);
      }, 300);
    },
    [onJoin],
  );

  // Handle skip mood selection
  const handleSkipMood = useCallback(() => {
    setShowMoodSelect(false);
    onJoin(undefined);
  }, [onJoin]);

  // Don't render during void phase
  if (phase === 'void') {
    return null;
  }

  // During reveal: light text on black. During cta: dark text on light background
  // Transition happens at 70% of reveal phase when scene starts becoming visible
  const isOnBlack = phase === 'reveal' && progress < 0.7;
  const titleColor = isOnBlack ? '#f8f4ed' : '#4a3f35';
  const subtitleColor = isOnBlack ? '#c8c0b8' : '#7a6b5a';
  const textShadow = isOnBlack
    ? '0 2px 40px rgba(0, 0, 0, 0.5)'
    : '0 2px 40px rgba(201, 160, 108, 0.3)';

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

      {/* CTA Button - only during cta phase, hidden when modal is open */}
      {phase === 'cta' && !showMoodSelect && (
        <button
          type="button"
          onClick={handleCtaClick}
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
            transitionDelay: '0.2s',
          }}
        >
          synchronize your breath with the world
        </p>
      )}

      {/* Mood Selection Modal */}
      {showMoodSelect && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: moodSelectAnimated ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            transition: 'background 0.4s ease-out',
          }}
        >
          <div
            style={{
              background: 'rgba(253, 251, 247, 0.92)',
              backdropFilter: 'blur(40px)',
              borderRadius: '32px',
              border: '1px solid rgba(160, 140, 120, 0.15)',
              padding: '40px 36px',
              maxWidth: '420px',
              width: '90%',
              opacity: moodSelectAnimated ? 1 : 0,
              transform: moodSelectAnimated
                ? 'scale(1) translateY(0)'
                : 'scale(0.97) translateY(16px)',
              transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.12)',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2
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
