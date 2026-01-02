import { useCallback, useEffect, useState } from 'react';
import { Letterbox } from './Letterbox';
import { TitleReveal } from './TitleReveal';
import type { CinematicConfig, IntroPhase } from './types';
import { useCinematicTimeline } from './useCinematicTimeline';

interface CinematicIntroProps extends CinematicConfig {
  /** Children to render - receives phase state for 3D integration */
  children: React.ReactNode | ((phase: IntroPhase, progress: number) => React.ReactNode);
}

/**
 * CinematicIntro - Orchestrates the cinematic landing experience.
 *
 * Elegant minimal flow (shown to ALL users, returning and new):
 * 1. Globe visible with letterbox bars, title fades in (reveal)
 * 2. Letterbox retracts, CTA appears (cta)
 * 3. User clicks Join → mood selection → complete
 *
 * The intro is beautiful, minimal (~3s), and always worth showing.
 * skipIntro is only for programmatic/testing use, not for returning users.
 */
export function CinematicIntro({
  children,
  skipIntro: _skipIntro = false, // Reserved for programmatic/testing use
  speedMultiplier = 1,
  onComplete,
  onJoin,
}: CinematicIntroProps) {
  // Always start with intro not complete - we want everyone to see it
  const [introComplete, setIntroComplete] = useState(false);
  const [isRetracting, setIsRetracting] = useState(false);

  const handleComplete = useCallback(() => {
    setIntroComplete(true);
    onComplete?.();
  }, [onComplete]);

  const { phase, progress, advance, skip } = useCinematicTimeline({
    speedMultiplier,
    onComplete: handleComplete,
  });

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

  // Skip intro on Escape key (power user feature)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !introComplete) {
        skip();
        onJoin?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [introComplete, skip, onJoin]);

  // Render children - support both ReactNode and render prop
  const renderedChildren = typeof children === 'function' ? children(phase, progress) : children;

  return (
    <>
      {/* 3D Scene - always visible (no black screen) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
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
          {/* Title and CTA */}
          <TitleReveal phase={phase} progress={progress} onJoin={handleJoin} />

          {/* Letterbox bars - visible during reveal, retract during cta */}
          <Letterbox phase={phase} retracting={isRetracting} />
        </div>
      )}
    </>
  );
}

export default CinematicIntro;
