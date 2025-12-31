import type { IntroPhase } from './types';

interface LetterboxProps {
  /** Current intro phase */
  phase: IntroPhase;
  /** Whether letterbox is retracting */
  retracting?: boolean;
}

/**
 * Cinematic letterbox bars (2.35:1 aspect ratio).
 *
 * Creates the classic film look with black bars at top and bottom.
 * Bars retract smoothly when transitioning to main experience.
 */
export function Letterbox({ phase, retracting = false }: LetterboxProps) {
  // Letterbox visible during intro phases, hidden after CTA
  const isVisible = phase !== 'complete';

  // Calculate bar height (12% = ~2.35:1 cinematic ratio)
  const getBarHeight = () => {
    if (!isVisible) return '0%';
    if (retracting || phase === 'cta') return '0%';
    return '12%';
  };

  const barHeight = getBarHeight();
  const transitionDuration = retracting ? '1.5s' : '0.8s';

  const barStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    background: '#000',
    zIndex: 2000,
    transition: `height ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
    pointerEvents: 'none',
  };

  return (
    <>
      {/* Top bar */}
      <div
        style={{
          ...barStyle,
          top: 0,
          height: barHeight,
        }}
        aria-hidden="true"
      />

      {/* Bottom bar */}
      <div
        style={{
          ...barStyle,
          bottom: 0,
          height: barHeight,
        }}
        aria-hidden="true"
      />
    </>
  );
}
