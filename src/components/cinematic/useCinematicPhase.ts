import { useCallback, useEffect, useRef, useState } from 'react';
import { type IntroPhase, PHASE_SEQUENCE, PHASE_TIMING } from './types';

interface UseCinematicPhaseOptions {
  /** Speed multiplier (default 1.0) */
  speedMultiplier?: number;
  /** Callback when all phases complete */
  onComplete?: () => void;
  /** Start paused (for debugging) */
  startPaused?: boolean;
}

interface CinematicPhaseState {
  /** Current phase */
  phase: IntroPhase;
  /** Progress within current phase (0-1) */
  progress: number;
  /** Total elapsed time in ms */
  elapsed: number;
  /** Whether intro is complete */
  isComplete: boolean;
  /** Advance to next phase manually */
  advance: () => void;
  /** Skip to complete */
  skip: () => void;
}

/**
 * Hook for managing cinematic intro phase progression.
 *
 * Automatically advances through phases based on timing config,
 * except for 'cta' phase which waits for user interaction.
 */
export function useCinematicPhase({
  speedMultiplier = 1,
  onComplete,
  startPaused = false,
}: UseCinematicPhaseOptions = {}): CinematicPhaseState {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const phaseStartTime = useRef(Date.now());
  const rafId = useRef<number | undefined>(undefined);
  const isPaused = useRef(startPaused);

  const phase = PHASE_SEQUENCE[phaseIndex];

  // Advance to next phase
  const advance = useCallback(() => {
    const nextIndex = phaseIndex + 1;
    if (nextIndex >= PHASE_SEQUENCE.length) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    setPhaseIndex(nextIndex);
    setProgress(0);
    phaseStartTime.current = Date.now();

    // Check if we've reached complete
    if (PHASE_SEQUENCE[nextIndex] === 'complete') {
      setIsComplete(true);
      onComplete?.();
    }
  }, [phaseIndex, onComplete]);

  // Skip to complete
  const skip = useCallback(() => {
    setPhaseIndex(PHASE_SEQUENCE.length - 1);
    setProgress(1);
    setIsComplete(true);
    onComplete?.();
  }, [onComplete]);

  // Animation loop
  useEffect(() => {
    if (isComplete || isPaused.current) return;

    const tick = () => {
      const now = Date.now();
      const phaseElapsed = now - phaseStartTime.current;
      const phaseDuration = PHASE_TIMING[phase] / speedMultiplier;

      // Update progress
      const newProgress = phaseDuration > 0 ? Math.min(phaseElapsed / phaseDuration, 1) : 1;
      setProgress(newProgress);
      setElapsed((prev) => prev + 16); // Approximate frame time

      // Auto-advance if phase has duration and is complete
      // CTA phase has 0 duration = waits for manual advance
      if (phaseDuration > 0 && phaseElapsed >= phaseDuration) {
        advance();
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [phase, speedMultiplier, isComplete, advance]);

  return {
    phase,
    progress,
    elapsed,
    isComplete,
    advance,
    skip,
  };
}
