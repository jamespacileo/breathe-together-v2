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
 * Wraps the main scene and overlays cinematic elements:
 * - Black screen fade
 * - Letterbox bars (2.35:1 aspect)
 * - Fog reveal
 * - Title sequence
 * - CTA button
 *
 * The 3D scene renders underneath but is progressively revealed.
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
  useEffect(() => {
    switch (phase) {
      case 'void':
        setSceneOpacity(0);
        break;
      case 'glow':
        // Start revealing scene slightly
        setSceneOpacity(0.1 + progress * 0.2);
        break;
      case 'reveal':
        // Progressive reveal
        setSceneOpacity(0.3 + progress * 0.5);
        break;
      case 'title':
        setSceneOpacity(0.8 + progress * 0.1);
        break;
      case 'cta':
        setSceneOpacity(0.9);
        break;
      case 'complete':
        setSceneOpacity(1);
        setIsRetracting(true);
        break;
    }
  }, [phase, progress]);

  // Handle CTA click
  const handleJoin = useCallback(() => {
    // Start exit animation
    setIsRetracting(true);

    // Advance to complete after brief delay
    setTimeout(() => {
      advance();
      onJoin?.();
    }, 800);
  }, [advance, onJoin]);

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

  // If skip is enabled, render children directly
  if (skipIntro) {
    return <>{typeof children === 'function' ? children('complete', 1) : children}</>;
  }

  return (
    <>
      {/* 3D Scene - always renders, opacity controlled */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          opacity: sceneOpacity,
          transition: 'opacity 1.5s ease-out',
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
          {/* Black overlay for void/glow phases */}
          <VoidOverlay phase={phase} progress={progress} />

          {/* Center glow during glow phase */}
          <CenterGlow phase={phase} progress={progress} />

          {/* Title and CTA */}
          <TitleReveal phase={phase} onJoin={handleJoin} />

          {/* Letterbox bars */}
          <Letterbox phase={phase} retracting={isRetracting} />

          {/* Skip hint */}
          <SkipHint phase={phase} visible={phase !== 'void' && phase !== 'complete'} />
        </div>
      )}
    </>
  );
}

/**
 * Black overlay that fades during reveal
 */
function VoidOverlay({ phase, progress }: { phase: IntroPhase; progress: number }) {
  const getOpacity = () => {
    switch (phase) {
      case 'void':
        return 1;
      case 'glow':
        return 1 - progress * 0.3;
      case 'reveal':
        return 0.7 - progress * 0.5;
      case 'title':
        return 0.2 - progress * 0.15;
      case 'cta':
        return 0.05;
      case 'complete':
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0a0908',
        opacity: getOpacity(),
        transition: 'opacity 0.5s ease-out',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Warm center glow that appears during glow phase
 */
function CenterGlow({ phase, progress }: { phase: IntroPhase; progress: number }) {
  const getOpacity = () => {
    switch (phase) {
      case 'void':
        return 0;
      case 'glow':
        return progress * 0.6;
      case 'reveal':
        return 0.6 - progress * 0.4;
      case 'title':
      case 'cta':
        return 0.2;
      case 'complete':
        return 0;
      default:
        return 0;
    }
  };

  const getScale = () => {
    switch (phase) {
      case 'glow':
        return 0.5 + progress * 0.5;
      case 'reveal':
        return 1 + progress * 0.5;
      default:
        return 1;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '60vmin',
        height: '60vmin',
        transform: `translate(-50%, -50%) scale(${getScale()})`,
        background:
          'radial-gradient(ellipse at center, rgba(255, 235, 205, 0.4) 0%, rgba(255, 220, 180, 0.15) 40%, transparent 70%)',
        opacity: getOpacity(),
        transition: 'opacity 0.8s ease-out, transform 1.5s ease-out',
        pointerEvents: 'none',
        filter: 'blur(30px)',
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Subtle skip hint in corner
 */
function SkipHint({ phase, visible }: { phase: IntroPhase; visible: boolean }) {
  const [showHint, setShowHint] = useState(false);

  // Show hint after 3 seconds
  useEffect(() => {
    if (visible && phase !== 'cta') {
      const timer = setTimeout(() => setShowHint(true), 3000);
      return () => clearTimeout(timer);
    }
    if (phase === 'cta' || phase === 'complete') {
      setShowHint(false);
    }
  }, [visible, phase]);

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
