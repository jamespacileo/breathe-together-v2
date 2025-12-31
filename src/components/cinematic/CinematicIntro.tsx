import { useCallback, useEffect, useState } from 'react';
import { Letterbox } from './Letterbox';
import { TitleReveal } from './TitleReveal';
import type { CinematicConfig, IntroPhase } from './types';
import { useCinematicPhase } from './useCinematicPhase';

interface CinematicIntroProps extends CinematicConfig {
  /** Children to render - receives phase state for 3D integration */
  children: React.ReactNode | ((phase: IntroPhase, progress: number) => React.ReactNode);
}

/**
 * CinematicIntro - Orchestrates the cinematic landing experience.
 *
 * Simplified flow:
 * 1. Black screen (void)
 * 2. Globe reveals with letterbox (reveal)
 * 3. Main menu with title + CTA (cta)
 * 4. User clicks Join → complete
 */
export function CinematicIntro({
  children,
  skipIntro = false,
  speedMultiplier = 1,
  onComplete,
  onJoin,
}: CinematicIntroProps) {
  const [introComplete, setIntroComplete] = useState(skipIntro);
  const [sceneOpacity, setSceneOpacity] = useState(skipIntro ? 1 : 0);
  const [isRetracting, setIsRetracting] = useState(false);

  const handleComplete = useCallback(() => {
    setIntroComplete(true);
    onComplete?.();
  }, [onComplete]);

  const { phase, progress, advance, skip } = useCinematicPhase({
    speedMultiplier,
    onComplete: handleComplete,
  });

  // Handle scene visibility based on phase
  // Title appears on black first (15-40%), then scene gently fades in (50-100%)
  useEffect(() => {
    switch (phase) {
      case 'void':
        setSceneOpacity(0);
        break;
      case 'reveal': {
        // Scene starts fading in at 50% of reveal phase
        // Maps progress 0.5-1.0 → opacity 0-1 with easing
        const sceneProgress = Math.max(0, (progress - 0.5) * 2);
        // Apply ease-out for smoother reveal
        const easedProgress = 1 - (1 - sceneProgress) ** 2;
        setSceneOpacity(easedProgress);
        break;
      }
      case 'cta':
      case 'complete':
        setSceneOpacity(1);
        break;
    }
  }, [phase, progress]);

  // Handle CTA click (after mood selection in TitleReveal)
  const handleJoin = useCallback(
    (selectedMood?: string) => {
      // Start exit animation
      setIsRetracting(true);

      // Advance to complete after brief delay
      setTimeout(() => {
        advance();
        onJoin?.(selectedMood);
      }, 600);
    },
    [advance, onJoin],
  );

  // Skip intro on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !introComplete) {
        skip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [introComplete, skip]);

  // Render children - support both ReactNode and render prop
  const renderedChildren = typeof children === 'function' ? children(phase, progress) : children;

  // If skip is enabled, render children directly with main menu overlay
  if (skipIntro) {
    return <>{typeof children === 'function' ? children('cta', 1) : children}</>;
  }

  return (
    <>
      {/* 3D Scene - always renders, opacity controlled */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          opacity: sceneOpacity,
          transition: 'opacity 0.8s ease-out',
        }}
      >
        {renderedChildren}
      </div>

      {/* Cinematic overlay layer */}
      {!introComplete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            pointerEvents: phase === 'cta' ? 'auto' : 'none',
          }}
        >
          {/* Black overlay - stays visible while title appears, then fades gently */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#000',
              // Black overlay stays at 100% until 45% of reveal, then fades gradually
              opacity:
                phase === 'void'
                  ? 1
                  : phase === 'reveal'
                    ? Math.max(0, 1 - (progress - 0.45) * 1.8)
                    : 0,
              transition: 'opacity 1.2s ease-out',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />

          {/* Title and CTA */}
          <TitleReveal phase={phase} progress={progress} onJoin={handleJoin} />

          {/* Letterbox bars - visible during reveal and cta */}
          <Letterbox phase={phase} retracting={isRetracting} />

          {/* Skip hint */}
          {phase === 'reveal' && <SkipHint />}
        </div>
      )}
    </>
  );
}

/**
 * Subtle skip hint in corner
 */
function SkipHint() {
  const [showHint, setShowHint] = useState(false);

  // Show hint after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!showHint) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(12% + 24px)', // Above letterbox
        right: '24px',
        fontSize: '0.65rem',
        color: 'rgba(200, 190, 180, 0.4)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        pointerEvents: 'none',
        opacity: showHint ? 1 : 0,
        transition: 'opacity 1s ease-out',
      }}
    >
      press esc to skip
    </div>
  );
}

export default CinematicIntro;
