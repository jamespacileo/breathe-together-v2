/**
 * useFirstBreathCycle - Detects when user completes their first full breathing cycle
 *
 * Used for onboarding: after user selects mood, we wait for them to complete
 * one full breathing cycle before other users appear (settling in period).
 *
 * The breathing cycle is 19 seconds total:
 * - 4s inhale
 * - 7s hold
 * - 8s exhale
 *
 * This hook starts tracking from when `enabled` becomes true, and fires
 * `onComplete` once after one full cycle finishes at a natural boundary.
 */

import { useEffect, useRef, useState } from 'react';
import { BREATH_TOTAL_CYCLE } from '../constants';

interface UseFirstBreathCycleOptions {
  /** Whether to start tracking (typically after onboarding completes) */
  enabled: boolean;
  /** Called once when the first full cycle completes */
  onComplete?: () => void;
}

interface UseFirstBreathCycleResult {
  /** Whether the first cycle has been completed */
  hasCompleted: boolean;
  /** Progress through the current cycle (0-1) */
  cycleProgress: number;
  /** How many seconds remain in the current cycle */
  secondsRemaining: number;
}

/**
 * Get the current position in the breathing cycle (UTC-synchronized)
 */
function getCurrentCyclePosition(): { cycleIndex: number; cycleProgress: number } {
  const now = Date.now() / 1000;
  const cycleIndex = Math.floor(now / BREATH_TOTAL_CYCLE);
  const cycleProgress = (now % BREATH_TOTAL_CYCLE) / BREATH_TOTAL_CYCLE;
  return { cycleIndex, cycleProgress };
}

export function useFirstBreathCycle({
  enabled,
  onComplete,
}: UseFirstBreathCycleOptions): UseFirstBreathCycleResult {
  const [hasCompleted, setHasCompleted] = useState(false);
  const [cycleProgress, setCycleProgress] = useState(0);

  // Track the cycle index when we started
  const startCycleRef = useRef<number | null>(null);
  const hasCalledCompleteRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasCompleted) return;

    // Record the starting cycle index
    if (startCycleRef.current === null) {
      const { cycleIndex } = getCurrentCyclePosition();
      startCycleRef.current = cycleIndex;
    }

    let animationId: number;

    const checkCycle = () => {
      const { cycleIndex, cycleProgress: progress } = getCurrentCyclePosition();
      setCycleProgress(progress);

      // Complete when we've moved to a new cycle AND are past the start of that cycle
      // This ensures user experiences at least ~one full cycle
      if (
        startCycleRef.current !== null &&
        cycleIndex > startCycleRef.current &&
        progress > 0.1 && // Small buffer to ensure clean transition
        !hasCalledCompleteRef.current
      ) {
        hasCalledCompleteRef.current = true;
        setHasCompleted(true);
        onComplete?.();
        return; // Stop the loop
      }

      animationId = requestAnimationFrame(checkCycle);
    };

    checkCycle();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [enabled, hasCompleted, onComplete]);

  // Calculate seconds remaining
  const secondsRemaining = Math.ceil((1 - cycleProgress) * BREATH_TOTAL_CYCLE);

  return {
    hasCompleted,
    cycleProgress,
    secondsRemaining,
  };
}
