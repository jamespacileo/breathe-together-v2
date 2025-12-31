import { useCallback, useEffect, useState } from 'react';
import { MOOD_IDS, MOOD_METADATA, type MoodId } from '../constants';
import { MOOD_COLORS } from '../styles/designTokens';

interface MainMenuProps {
  onJoin: (selectedMood?: MoodId) => void;
}

/**
 * MainMenu - Clean minimal main menu for returning users
 *
 * Shows:
 * - App title "breathe together"
 * - "Join the Sphere" CTA
 * - Mood selection modal (after clicking CTA)
 * - Subtle presence count
 *
 * This is shown to:
 * - Returning users (who skip the intro)
 * - New users after the intro completes
 *
 * The 3D globe rotates in the background (no shards yet).
 */
export function MainMenu({ onJoin }: MainMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showMoodSelect, setShowMoodSelect] = useState(false);
  const [moodSelectAnimated, setMoodSelectAnimated] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);

  // Fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
        setIsExiting(true);
        setTimeout(() => onJoin(mood), 400);
      }, 300);
    },
    [onJoin],
  );

  // Handle skip mood selection
  const handleSkipMood = useCallback(() => {
    setShowMoodSelect(false);
    setIsExiting(true);
    setTimeout(() => onJoin(undefined), 400);
  }, [onJoin]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        opacity: isVisible && !isExiting ? 1 : 0,
        transition: 'opacity 0.8s ease-out',
      }}
    >
      {/* Title */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '48px',
          transform: isVisible && !isExiting ? 'translateY(0)' : 'translateY(20px)',
          transition: 'transform 1s ease-out, opacity 1s ease-out',
        }}
      >
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 'clamp(2rem, 8vw, 4rem)',
            fontWeight: 300,
            color: '#4a3f35',
            letterSpacing: '0.2em',
            textTransform: 'lowercase',
            margin: 0,
            textShadow: '0 2px 20px rgba(201, 160, 108, 0.3)',
          }}
        >
          breathe
        </h1>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 'clamp(1.2rem, 4vw, 2rem)',
            fontWeight: 300,
            color: '#7a6b5a',
            letterSpacing: '0.25em',
            textTransform: 'lowercase',
            margin: 0,
          }}
        >
          together
        </h2>
      </div>

      {/* CTA Button - hidden when modal is open */}
      {!showMoodSelect && (
        <button
          type="button"
          onClick={handleCtaClick}
          style={{
            background: 'rgba(255, 252, 245, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(201, 160, 108, 0.3)',
            borderRadius: '32px',
            padding: '16px 40px',
            cursor: 'pointer',
            transition: 'all 0.4s ease',
            transform: isVisible && !isExiting ? 'scale(1)' : 'scale(0.95)',
            boxShadow: '0 8px 32px rgba(138, 131, 124, 0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(201, 160, 108, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(138, 131, 124, 0.15)';
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#4a3f35',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            Join the Sphere
          </span>
        </button>
      )}

      {/* Hint text - hidden when modal is open */}
      {!showMoodSelect && (
        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '0.75rem',
            color: '#9a8a7a',
            letterSpacing: '0.1em',
            marginTop: '24px',
            opacity: isVisible && !isExiting ? 0.7 : 0,
            transition: 'opacity 1s ease-out 0.3s',
          }}
        >
          synchronize your breath with the world
        </p>
      )}

      {/* Presence count */}
      <div
        style={{
          position: 'absolute',
          bottom: '32px',
          fontSize: '0.7rem',
          color: '#9a8a7a',
          letterSpacing: '0.1em',
          opacity: isVisible && !isExiting && !showMoodSelect ? 0.5 : 0,
          transition: 'opacity 1s ease-out 0.5s',
        }}
      >
        <span style={{ fontWeight: 600 }}>73</span> breathing together
      </div>

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
