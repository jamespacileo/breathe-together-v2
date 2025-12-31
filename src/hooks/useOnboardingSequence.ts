/**
 * useOnboardingSequence - State machine for mood selection → shard reveal flow
 *
 * Implements a cinematic onboarding sequence that teaches users their shard
 * represents them through carefully timed visual reveals.
 *
 * Phase Sequence:
 * 1. mood_selected (100ms) - Brief confirmation of selection
 * 2. dissolving (500ms) - Modal content fades, selected mood stays visible
 * 3. interstitial (2500ms) - "This is you" reveal with pulsing icosahedron
 * 4. launching (1200ms) - Icosahedron flies to orbit position
 * 5. integrating (800ms) - Shard settles into breathing rhythm
 * 6. complete - Normal breathing mode
 *
 * Game dev philosophy: Each phase has clear visual focus and enough time
 * for the eye to follow. Overlapping transitions create flow.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MoodId } from '../constants';

/** Onboarding phase states */
export type OnboardingPhase =
  | 'idle' // Not started
  | 'mood_selected' // User just clicked a mood
  | 'dissolving' // Modal fading out
  | 'interstitial' // "This is you" screen
  | 'launching' // Icosahedron flying to position
  | 'integrating' // Settling into scene
  | 'complete'; // Done, normal mode

/** Phase timing configuration (milliseconds) */
const PHASE_TIMINGS: Record<OnboardingPhase, number> = {
  idle: 0,
  mood_selected: 100,
  dissolving: 500,
  interstitial: 2500,
  launching: 1200,
  integrating: 800,
  complete: 0,
};

/** Next phase transitions */
const NEXT_PHASE: Record<OnboardingPhase, OnboardingPhase> = {
  idle: 'idle',
  mood_selected: 'dissolving',
  dissolving: 'interstitial',
  interstitial: 'launching',
  launching: 'integrating',
  integrating: 'complete',
  complete: 'complete',
};

export interface OnboardingState {
  /** Current phase of the onboarding sequence */
  phase: OnboardingPhase;
  /** Selected mood (null until user selects) */
  selectedMood: MoodId | null;
  /** Progress through current phase (0-1) */
  phaseProgress: number;
  /** Whether onboarding has completed at least once */
  hasOnboarded: boolean;
  /** Whether to show the user's shard highlighted */
  showUserHighlight: boolean;
}

export interface OnboardingActions {
  /** Start the onboarding sequence with a mood selection */
  selectMood: (mood: MoodId) => void;
  /** Skip to complete state (for returning users) */
  skipOnboarding: () => void;
  /** Reset to allow re-onboarding */
  reset: () => void;
  /** Check if we're in any active onboarding phase */
  isOnboarding: boolean;
  /** Check if modal should be hidden */
  shouldHideModal: boolean;
}

/**
 * Hook for managing onboarding sequence state
 *
 * @param onPhaseChange - Optional callback when phase changes
 * @returns State and actions for the onboarding sequence
 */
export function useOnboardingSequence(
  onPhaseChange?: (phase: OnboardingPhase, mood: MoodId | null) => void,
): OnboardingState & OnboardingActions {
  const [phase, setPhase] = useState<OnboardingPhase>('idle');
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  const phaseStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Progress animation loop
  useEffect(() => {
    if (phase === 'idle' || phase === 'complete') {
      setPhaseProgress(phase === 'complete' ? 1 : 0);
      return;
    }

    const duration = PHASE_TIMINGS[phase];
    phaseStartTimeRef.current = performance.now();

    const animate = () => {
      const elapsed = performance.now() - phaseStartTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setPhaseProgress(progress);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Phase complete, move to next
        const nextPhase = NEXT_PHASE[phase];
        setPhase(nextPhase);

        if (nextPhase === 'complete') {
          setHasOnboarded(true);
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [phase]);

  // Notify on phase change
  useEffect(() => {
    onPhaseChange?.(phase, selectedMood);
  }, [phase, selectedMood, onPhaseChange]);

  const selectMood = useCallback((mood: MoodId) => {
    setSelectedMood(mood);
    setPhase('mood_selected');
    setPhaseProgress(0);
  }, []);

  const skipOnboarding = useCallback(() => {
    setPhase('complete');
    setHasOnboarded(true);
    setPhaseProgress(1);
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setSelectedMood(null);
    setPhaseProgress(0);
    cancelAnimationFrame(animationFrameRef.current);
  }, []);

  const isOnboarding = phase !== 'idle' && phase !== 'complete' && phase !== 'mood_selected';

  const shouldHideModal =
    phase === 'dissolving' ||
    phase === 'interstitial' ||
    phase === 'launching' ||
    phase === 'integrating' ||
    phase === 'complete';

  // Show user highlight after launching phase starts
  const showUserHighlight =
    phase === 'launching' || phase === 'integrating' || phase === 'complete';

  return {
    phase,
    selectedMood,
    phaseProgress,
    hasOnboarded,
    showUserHighlight,
    selectMood,
    skipOnboarding,
    reset,
    isOnboarding,
    shouldHideModal,
  };
}

/**
 * Easing functions for animations
 */
export const ONBOARDING_EASINGS = {
  /** Fast start, slow end - for flight animation */
  easeOutExpo: (t: number): number => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),

  /** Smooth acceleration/deceleration - for fades */
  easeInOutQuad: (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),

  /** Slight overshoot then settle - for scale */
  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },

  /** Elastic bounce - for attention */
  easeOutElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};
