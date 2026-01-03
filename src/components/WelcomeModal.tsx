import { useCallback, useEffect, useRef, useState } from 'react';

interface WelcomeModalProps {
  /** Number of users currently breathing */
  userCount?: number;
  /** Called when modal is dismissed */
  onDismiss: () => void;
}

/**
 * WelcomeModal - Gentle welcome message when entering the full breathing experience.
 *
 * Shows "Welcome to the Sphere" with user count. Any interaction dismisses it.
 * Uses soft fade animation for elegant entry/exit.
 */
export function WelcomeModal({ userCount = 73, onDismiss }: WelcomeModalProps) {
  const [isAnimatedIn, setIsAnimatedIn] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const hasCalledDismiss = useRef(false);

  // Fade in on mount - immediate visibility with delayed animation
  useEffect(() => {
    // Use requestAnimationFrame to ensure the initial render happens first
    const raf = requestAnimationFrame(() => {
      setIsAnimatedIn(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = useCallback(() => {
    // Prevent double-dismiss
    if (hasCalledDismiss.current || isDismissing) return;
    hasCalledDismiss.current = true;
    setIsDismissing(true);
    setIsAnimatedIn(false);
    // Call onDismiss after animation completes
    setTimeout(onDismiss, 400);
  }, [onDismiss, isDismissing]);

  // Also dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);

  const isAnimated = isAnimatedIn && !isDismissing;

  return (
    <button
      type="button"
      onClick={handleDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        cursor: 'pointer',
        border: 'none',
        // Subtle vignette effect
        background: isAnimated
          ? 'radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.1) 100%)'
          : 'transparent',
        transition: 'background 0.5s ease-out',
      }}
    >
      {/* Content wrapper with soft backdrop */}
      <div
        style={{
          position: 'relative',
          padding: '48px 64px',
          // Soft elliptical gradient backdrop - matches InspirationalText
          background: `radial-gradient(
            ellipse 140% 120% at center,
            rgba(253, 251, 247, 0.85) 0%,
            rgba(253, 251, 247, 0) 70%
          )`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '100px',
          textAlign: 'center',
          opacity: isAnimated ? 1 : 0,
          transform: isAnimated ? 'scale(1)' : 'scale(0.95)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Main title */}
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
            fontWeight: 300,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#4a3f35',
            margin: 0,
            textShadow: '0 0 30px rgba(255, 252, 240, 0.8), 0 0 60px rgba(201, 160, 108, 0.3)',
          }}
        >
          Welcome to the Sphere
        </h1>

        {/* User count */}
        <p
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
            fontWeight: 400,
            letterSpacing: '0.1em',
            color: '#7a6b5a',
            margin: '16px 0 0 0',
            textShadow: '0 0 20px rgba(255, 252, 240, 0.6)',
          }}
        >
          <span style={{ fontWeight: 500, color: '#5a4d42' }}>{userCount}</span> breathing together
        </p>

        {/* Subtle hint to continue */}
        <p
          style={{
            fontSize: '0.7rem',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#9a8a7a',
            margin: '32px 0 0 0',
            opacity: 0.7,
          }}
        >
          tap anywhere to continue
        </p>
      </div>
    </button>
  );
}
