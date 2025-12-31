import { useEffect, useState } from 'react';

interface MainMenuProps {
  onJoin: () => void;
}

/**
 * MainMenu - Clean minimal main menu for returning users
 *
 * Shows:
 * - App title "breathe together"
 * - "Join the Sphere" CTA
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

  // Fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleJoin = () => {
    setIsExiting(true);
    // Delay actual join to allow exit animation
    setTimeout(onJoin, 600);
  };

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

      {/* CTA Button */}
      <button
        type="button"
        onClick={handleJoin}
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

      {/* Hint text */}
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

      {/* Presence count */}
      <div
        style={{
          position: 'absolute',
          bottom: '32px',
          fontSize: '0.7rem',
          color: '#9a8a7a',
          letterSpacing: '0.1em',
          opacity: isVisible && !isExiting ? 0.5 : 0,
          transition: 'opacity 1s ease-out 0.5s',
        }}
      >
        <span style={{ fontWeight: 600 }}>73</span> breathing together
      </div>
    </div>
  );
}
