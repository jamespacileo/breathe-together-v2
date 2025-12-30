import { useEffect, useRef, useState } from 'react';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';

/**
 * Above & Beyond inspired quotes - themes of unity, togetherness, and collective consciousness
 * Each quote has a top and bottom line for visual balance around the globe
 */
const INSPIRATIONAL_QUOTES = [
  { top: 'We Are All', bottom: 'We Need' },
  { top: 'Love Is', bottom: 'The Answer' },
  { top: 'You Are Not', bottom: 'Alone' },
  { top: 'Together We', bottom: 'Breathe As One' },
  { top: 'This Moment', bottom: 'Is Ours' },
  { top: 'Let Go', bottom: 'And Trust' },
  { top: 'Feel The', bottom: 'Connection' },
  { top: 'We Rise', bottom: 'Together' },
  { top: 'Peace Lives', bottom: 'Within Us' },
  { top: 'One Breath', bottom: 'One World' },
  { top: 'The Light', bottom: 'Is In You' },
  { top: 'Surrender', bottom: 'To Now' },
] as const;

// Pre-computed phase timing
const PHASE_DURATIONS = [
  BREATH_PHASES.INHALE,
  BREATH_PHASES.HOLD_IN,
  BREATH_PHASES.EXHALE,
  BREATH_PHASES.HOLD_OUT,
];

/**
 * Calculate text opacity based on current phase and progress
 * - Inhale (phase 0): Fade in from 0 → 1
 * - Hold-in (phase 1): Stay at 1 (fully visible)
 * - Exhale (phase 2): Fade out from 1 → 0
 * - Hold-out (phase 3): Stay at 0 (hidden)
 */
function calculateOpacity(phaseIndex: number, phaseProgress: number): number {
  switch (phaseIndex) {
    case 0: // Inhale - fade in
      return easeOutQuad(phaseProgress);
    case 1: // Hold-in - fully visible
      return 1;
    case 2: // Exhale - fade out
      return 1 - easeInQuad(phaseProgress);
    case 3: // Hold-out - hidden
      return 0;
    default:
      return 0;
  }
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeInQuad(t: number): number {
  return t * t;
}

/**
 * Calculate current phase from cycle time
 */
function getPhaseInfo(cycleTime: number): { phaseIndex: number; phaseProgress: number } {
  let accumulatedTime = 0;
  let phaseIndex = 0;

  for (let i = 0; i < PHASE_DURATIONS.length; i++) {
    const duration = PHASE_DURATIONS[i] ?? 0;
    if (cycleTime < accumulatedTime + duration) {
      phaseIndex = i;
      break;
    }
    accumulatedTime += duration;
  }

  const phaseDuration = PHASE_DURATIONS[phaseIndex] ?? 1;
  const phaseTime = cycleTime - accumulatedTime;
  const phaseProgress = Math.min(1, Math.max(0, phaseTime / phaseDuration));

  return { phaseIndex, phaseProgress };
}

/**
 * InspirationalText - Above & Beyond style inspirational messages
 *
 * Displays centered text above and below the breathing globe that
 * fades in during inhale and out during exhale. Creates a sense of
 * unity and collective consciousness.
 *
 * Performance: Uses RAF loop with direct DOM updates (no React state)
 */
export function InspirationalText() {
  const topTextRef = useRef<HTMLDivElement>(null);
  const bottomTextRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const cycleCountRef = useRef(0);
  const prevPhaseRef = useRef(-1);

  // Change quote every 3 breathing cycles
  useEffect(() => {
    let animationId: number;

    const updateText = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex, phaseProgress } = getPhaseInfo(cycleTime);

      // Calculate and apply opacity
      const opacity = calculateOpacity(phaseIndex, phaseProgress);

      if (containerRef.current) {
        containerRef.current.style.opacity = String(opacity);
        // Subtle scale animation for depth
        const scale = 0.95 + opacity * 0.05;
        containerRef.current.style.transform = `translateX(-50%) scale(${scale})`;
      }

      // Track cycle completion and rotate quotes
      if (phaseIndex === 0 && prevPhaseRef.current === 3) {
        cycleCountRef.current += 1;
        if (cycleCountRef.current >= 3) {
          cycleCountRef.current = 0;
          setQuoteIndex((prev) => (prev + 1) % INSPIRATIONAL_QUOTES.length);
        }
      }
      prevPhaseRef.current = phaseIndex;

      animationId = requestAnimationFrame(updateText);
    };

    updateText();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const quote = INSPIRATIONAL_QUOTES[quoteIndex] ?? INSPIRATIONAL_QUOTES[0];

  // Design tokens matching GaiaUI
  const colors = {
    text: '#7a6b5e',
    textGlow: 'rgba(201, 160, 108, 0.5)',
    subtleGlow: 'rgba(255, 252, 245, 0.8)',
  };

  const textStyle: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 'clamp(1.8rem, 4vw, 3rem)',
    fontWeight: 300,
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    color: colors.text,
    textShadow: `
      0 0 40px ${colors.subtleGlow},
      0 0 80px ${colors.textGlow},
      0 2px 10px rgba(0, 0, 0, 0.1)
    `,
    textAlign: 'center',
    lineHeight: 1.2,
    userSelect: 'none',
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 50,
        opacity: 0,
        transition: 'opacity 0.1s linear',
        gap: 'min(40vh, 280px)', // Space for globe in center
      }}
    >
      {/* Top text - above the globe */}
      <div
        ref={topTextRef}
        style={{
          ...textStyle,
          marginTop: '-5vh', // Nudge up slightly
        }}
      >
        {quote.top}
      </div>

      {/* Bottom text - below the globe */}
      <div
        ref={bottomTextRef}
        style={{
          ...textStyle,
          marginBottom: '-5vh', // Nudge down slightly
        }}
      >
        {quote.bottom}
      </div>
    </div>
  );
}
