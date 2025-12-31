import { useCallback, useEffect, useState } from 'react';

interface TutorialPromptModalProps {
  /** Called when user chooses to start tutorial */
  onStartTutorial: () => void;
  /** Called when user chooses to skip tutorial */
  onSkipTutorial: () => void;
  /** Whether this is a returning user (affects copy) */
  isReturningUser?: boolean;
}

/**
 * TutorialPromptModal - Gentle prompt asking if user wants a guided introduction.
 *
 * Appears after mood selection. Respects user's time with clear skip option.
 * Copy adjusts for returning vs new users.
 */
export function TutorialPromptModal({
  onStartTutorial,
  onSkipTutorial,
  isReturningUser = false,
}: TutorialPromptModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimated, setIsAnimated] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    const animateTimer = setTimeout(() => setIsAnimated(true), 150);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(animateTimer);
    };
  }, []);

  const handleStartTutorial = useCallback(() => {
    setIsAnimated(false);
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(onStartTutorial, 200);
    }, 150);
  }, [onStartTutorial]);

  const handleSkip = useCallback(() => {
    setIsAnimated(false);
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(onSkipTutorial, 200);
    }, 150);
  }, [onSkipTutorial]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: isAnimated ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0)',
        backdropFilter: 'blur(8px)',
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
          borderRadius: '28px',
          border: '1px solid rgba(160, 140, 120, 0.15)',
          padding: '36px 32px',
          maxWidth: '380px',
          width: '90%',
          textAlign: 'center',
          opacity: isAnimated ? 1 : 0,
          transform: isAnimated ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(12px)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Icon - simple breathing circle */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, rgba(201, 160, 108, 0.2) 0%, rgba(201, 160, 108, 0.1) 100%)',
            border: '2px solid rgba(201, 160, 108, 0.3)',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(201, 160, 108, 0.6)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '1.5rem',
            fontWeight: 400,
            margin: '0 0 12px 0',
            letterSpacing: '0.1em',
            color: '#4a3f35',
          }}
        >
          {isReturningUser ? 'Quick Refresher?' : 'First Time Here?'}
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: '0.85rem',
            color: '#7a6b5a',
            margin: '0 0 28px 0',
            lineHeight: 1.6,
            letterSpacing: '0.02em',
          }}
        >
          {isReturningUser
            ? 'Would you like a quick refresher on the breathing rhythm?'
            : 'Take a moment to learn how your presence joins others in the breathing space.'}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Primary: Start Tutorial */}
          <button
            type="button"
            onClick={handleStartTutorial}
            style={{
              background: 'rgba(201, 160, 108, 0.9)',
              color: '#fff',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '24px',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 16px rgba(201, 160, 108, 0.3)',
            }}
          >
            {isReturningUser ? 'Show Me' : 'Guide Me'}
          </button>

          {/* Secondary: Skip */}
          <button
            type="button"
            onClick={handleSkip}
            style={{
              background: 'transparent',
              color: '#9a8a7a',
              border: 'none',
              padding: '12px',
              fontSize: '0.72rem',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              opacity: 0.8,
              transition: 'opacity 0.2s ease',
            }}
          >
            {isReturningUser ? 'I Remember' : "Skip, I'll Explore"}
          </button>
        </div>
      </div>

      {/* Keyframe animation for the pulsing icon */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.2); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
