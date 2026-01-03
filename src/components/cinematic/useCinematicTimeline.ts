import gsap from 'gsap';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type IntroPhase, PHASE_SEQUENCE, PHASE_TIMING } from './types';

interface UseCinematicTimelineOptions {
  /** Speed multiplier (default 1.0) */
  speedMultiplier?: number;
  /** Callback when all phases complete */
  onComplete?: () => void;
  /** Callback when phase changes */
  onPhaseChange?: (phase: IntroPhase) => void;
  /** Start paused (for debugging) */
  startPaused?: boolean;
}

interface CinematicTimelineState {
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
  /** Pause timeline */
  pause: () => void;
  /** Resume timeline */
  resume: () => void;
  /** Get underlying GSAP timeline (for advanced control) */
  timeline: gsap.core.Timeline | null;
}

/**
 * GSAP Timeline hook for cinematic intro orchestration.
 *
 * Replaces RAF-based phase progression with GSAP Timeline for:
 * - Precise sequencing with labels
 * - Easy pause/resume/skip controls
 * - Better performance (GSAP's optimized ticker)
 * - Smoother easing options
 *
 * Phases auto-advance except 'cta' which waits for manual advance.
 */
export function useCinematicTimeline({
  speedMultiplier = 1,
  onComplete,
  onPhaseChange,
  startPaused = false,
}: UseCinematicTimelineOptions = {}): CinematicTimelineState {
  const [phase, setPhase] = useState<IntroPhase>('reveal');
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const phaseIndexRef = useRef(0);
  const progressProxy = useRef({ value: 0, elapsed: 0 });

  // Callbacks ref to avoid recreation
  const callbacksRef = useRef({ onComplete, onPhaseChange });
  callbacksRef.current = { onComplete, onPhaseChange };

  // Calculate total duration for auto-advancing phases
  const autoAdvanceDuration = useMemo(() => {
    return PHASE_TIMING.reveal / 1000 / speedMultiplier;
  }, [speedMultiplier]);

  // Advance to next phase
  const advance = useCallback(() => {
    const nextIndex = phaseIndexRef.current + 1;
    if (nextIndex >= PHASE_SEQUENCE.length) {
      setIsComplete(true);
      callbacksRef.current.onComplete?.();
      return;
    }

    phaseIndexRef.current = nextIndex;
    const nextPhase = PHASE_SEQUENCE[nextIndex];
    setPhase(nextPhase);
    setProgress(0);
    callbacksRef.current.onPhaseChange?.(nextPhase);

    // If complete phase, finish
    if (nextPhase === 'complete') {
      setIsComplete(true);
      callbacksRef.current.onComplete?.();
    }
  }, []);

  // Skip to complete
  const skip = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    phaseIndexRef.current = PHASE_SEQUENCE.length - 1;
    setPhase('complete');
    setProgress(1);
    setIsComplete(true);
    callbacksRef.current.onComplete?.();
  }, []);

  // Pause timeline
  const pause = useCallback(() => {
    timelineRef.current?.pause();
  }, []);

  // Resume timeline
  const resume = useCallback(() => {
    timelineRef.current?.resume();
  }, []);

  // Create and manage GSAP timeline
  useEffect(() => {
    // Create timeline with GSAP
    const tl = gsap.timeline({
      paused: startPaused,
      onUpdate: () => {
        // Update React state from proxy object
        setProgress(progressProxy.current.value);
        setElapsed(progressProxy.current.elapsed * 1000);
      },
    });

    // Store reference
    timelineRef.current = tl;

    // Phase 1: Reveal (auto-advances after duration)
    tl.to(
      progressProxy.current,
      {
        value: 1,
        elapsed: autoAdvanceDuration,
        duration: autoAdvanceDuration,
        ease: 'power2.inOut',
        onComplete: () => {
          // Auto-advance from reveal to cta
          advance();
        },
      },
      'reveal',
    );

    // Start timeline
    if (!startPaused) {
      tl.play();
    }

    // Cleanup
    return () => {
      tl.kill();
      timelineRef.current = null;
    };
  }, [autoAdvanceDuration, startPaused, advance]);

  return {
    phase,
    progress,
    elapsed,
    isComplete,
    advance,
    skip,
    pause,
    resume,
    timeline: timelineRef.current,
  };
}
