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
 * Elegant minimal flow:
 * 1. Globe visible with letterbox bars, title fades in (reveal)
 * 2. Letterbox retracts, CTA appears (cta)
 * 3. User clicks Join → mood selection → complete
 */
export function CinematicIntro({
  children,
  skipIntro = false,
  speedMultiplier = 1,
  onComplete,
  onJoin,
}: CinematicIntroProps) {
  const [introComplete, setIntroComplete] = useState(skipIntro);
  const [isRetracting, setIsRetracting] = useState(false);

  const handleComplete = useCallback(() => {
    setIntroComplete(true);
    onComplete?.();
  }, [onComplete]);

  const { phase, progress, advance, skip } = useCinematicPhase({
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
