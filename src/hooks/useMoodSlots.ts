/**
 * useMoodSlots - Hook for managing mood slot state with smooth transitions
 *
 * Provides a reactive slot-based user ordering system that:
 * - Tracks per-slot animation states (entering, exiting, idle)
 * - Diffs changes to generate smooth transitions
 * - Prevents jarring visual glitches during rapid updates
 *
 * **Animation State Machine (per slot):**
 * ```
 * [empty] --addUser--> [entering] --animComplete--> [idle]
 *                                      |
 *                                      v
 * [empty] <--animComplete-- [exiting] <--removeUser-- [idle]
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MoodId } from '../constants';
import {
  createEmptySlots,
  diffSlots,
  type MoodSlots,
  reconcileSlotsWithCounts,
  type SlotsDiff,
} from '../lib/moodSlots';

/**
 * Animation state for each slot
 */
export type SlotAnimationState =
  | 'idle' // Normal state, breathing animation
  | 'entering' // Fading/scaling in (0→1)
  | 'exiting'; // Fading/scaling out (1→0)

/**
 * Complete state for a single slot
 */
export interface SlotState {
  /** Current mood (null if empty or exiting) */
  mood: MoodId | null;
  /** Previous mood (used during exit animation) */
  previousMood: MoodId | null;
  /** Animation state */
  animationState: SlotAnimationState;
  /** Animation progress (0-1) */
  animationProgress: number;
  /** Timestamp when animation started (for useFrame interpolation) */
  animationStartTime: number;
}

/**
 * Configuration for the hook
 */
export interface UseMoodSlotsConfig {
  /** Total number of slots (fixed) @default 48 */
  slotCount?: number;
  /** Duration of enter/exit animations in seconds @default 0.5 */
  animationDuration?: number;
}

/**
 * Return type from the hook
 */
export interface UseMoodSlotsResult {
  /** Current slot states array */
  slotStates: SlotState[];
  /** Add a user with specified mood */
  addUser: (mood: MoodId) => number | null;
  /** Remove user from specific slot */
  removeUser: (slotIndex: number) => void;
  /** Batch update from mood counts (for presence sync) */
  syncFromMoodCounts: (moodCounts: Partial<Record<MoodId, number>>) => void;
  /** Update animation progress (call from useFrame) */
  tickAnimations: (elapsedTime: number) => void;
  /** Get the underlying slots array */
  slots: MoodSlots;
  /** Last diff (for debugging) */
  lastDiff: SlotsDiff | null;
}

/**
 * Create initial slot state
 */
function createSlotState(mood: MoodId | null = null): SlotState {
  return {
    mood,
    previousMood: null,
    animationState: mood ? 'idle' : 'idle',
    animationProgress: mood ? 1 : 0,
    animationStartTime: 0,
  };
}

/**
 * Hook for managing mood slots with smooth transitions
 */
export function useMoodSlots(config: UseMoodSlotsConfig = {}): UseMoodSlotsResult {
  const { slotCount = 48, animationDuration = 0.5 } = config;

  // Core slot data (mood per slot)
  const [slots, setSlots] = useState<MoodSlots>(() => createEmptySlots(slotCount));

  // Animation states per slot
  const [slotStates, setSlotStates] = useState<SlotState[]>(() =>
    Array.from({ length: slotCount }, () => createSlotState()),
  );

  // Track last diff for debugging
  const [lastDiff, setLastDiff] = useState<SlotsDiff | null>(null);

  // Ref for animation timing (doesn't cause re-renders)
  const animationTimingRef = useRef<Map<number, { startTime: number; duration: number }>>(
    new Map(),
  );

  /**
   * Add a user to the first available slot
   */
  const addUser = useCallback(
    (mood: MoodId): number | null => {
      const emptyIndex = slots.indexOf(null);
      if (emptyIndex === -1) return null;

      // Update slots
      setSlots((prev) => {
        const next = [...prev];
        next[emptyIndex] = mood;
        return next;
      });

      // Start enter animation
      setSlotStates((prev) => {
        const next = [...prev];
        next[emptyIndex] = {
          mood,
          previousMood: null,
          animationState: 'entering',
          animationProgress: 0,
          animationStartTime: performance.now() / 1000,
        };
        return next;
      });

      animationTimingRef.current.set(emptyIndex, {
        startTime: performance.now() / 1000,
        duration: animationDuration,
      });

      return emptyIndex;
    },
    [slots, animationDuration],
  );

  /**
   * Remove a user from a specific slot
   */
  const removeUser = useCallback(
    (slotIndex: number): void => {
      if (slotIndex < 0 || slotIndex >= slots.length) return;
      if (slots[slotIndex] === null) return;

      const previousMood = slots[slotIndex];

      // Start exit animation (keep mood visible during animation)
      setSlotStates((prev) => {
        const next = [...prev];
        next[slotIndex] = {
          mood: null,
          previousMood,
          animationState: 'exiting',
          animationProgress: 1,
          animationStartTime: performance.now() / 1000,
        };
        return next;
      });

      // Clear slot after animation completes
      setTimeout(() => {
        setSlots((prev) => {
          const next = [...prev];
          next[slotIndex] = null;
          return next;
        });
      }, animationDuration * 1000);

      animationTimingRef.current.set(slotIndex, {
        startTime: performance.now() / 1000,
        duration: animationDuration,
      });
    },
    [slots, animationDuration],
  );

  /**
   * Sync slots from mood counts (used for presence updates)
   * Intelligently reconciles to minimize visual disruption
   */
  const syncFromMoodCounts = useCallback(
    (moodCounts: Partial<Record<MoodId, number>>): void => {
      setSlots((prevSlots) => {
        const newSlots = reconcileSlotsWithCounts(prevSlots, moodCounts);
        const diff = diffSlots(prevSlots, newSlots);

        if (diff.hasChanges) {
          setLastDiff(diff);

          // Process animations for each change
          // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Animation state updates for enters, exits, and changes require multiple conditional branches
          setSlotStates((prevStates) => {
            const nextStates = [...prevStates];
            const now = performance.now() / 1000;

            // Handle enters
            for (const { slotIndex, mood } of diff.enters) {
              nextStates[slotIndex] = {
                mood,
                previousMood: null,
                animationState: 'entering',
                animationProgress: 0,
                animationStartTime: now,
              };
              animationTimingRef.current.set(slotIndex, {
                startTime: now,
                duration: animationDuration,
              });
            }

            // Handle exits
            for (const { slotIndex, previousMood } of diff.exits) {
              nextStates[slotIndex] = {
                mood: null,
                previousMood,
                animationState: 'exiting',
                animationProgress: 1,
                animationStartTime: now,
              };
              animationTimingRef.current.set(slotIndex, {
                startTime: now,
                duration: animationDuration,
              });
            }

            // Handle mood changes (instant for now, could animate color)
            for (const { slotIndex, to } of diff.changes) {
              nextStates[slotIndex] = {
                ...nextStates[slotIndex],
                mood: to,
                previousMood: diff.changes.find((c) => c.slotIndex === slotIndex)?.from ?? null,
                // Keep animation state if already animating, otherwise idle
                animationState:
                  nextStates[slotIndex].animationState === 'idle'
                    ? 'idle'
                    : nextStates[slotIndex].animationState,
              };
            }

            return nextStates;
          });
        }

        return newSlots;
      });
    },
    [animationDuration],
  );

  /**
   * Update animation progress (call from useFrame)
   */
  const tickAnimations = useCallback((elapsedTime: number): void => {
    let hasActiveAnimations = false;

    setSlotStates((prevStates) => {
      let updated = false;
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Animation progress calculation requires timing checks and state transitions
      const nextStates = prevStates.map((state, index) => {
        if (state.animationState === 'idle') return state;

        const timing = animationTimingRef.current.get(index);
        if (!timing) return state;

        const elapsed = elapsedTime - timing.startTime;
        const progress = Math.min(elapsed / timing.duration, 1);

        hasActiveAnimations = hasActiveAnimations || progress < 1;

        if (progress >= 1) {
          // Animation complete
          updated = true;
          animationTimingRef.current.delete(index);

          if (state.animationState === 'exiting') {
            return createSlotState(null);
          }
          return {
            ...state,
            animationState: 'idle' as const,
            animationProgress: 1,
          };
        }

        updated = true;
        return {
          ...state,
          animationProgress: state.animationState === 'entering' ? progress : 1 - progress,
        };
      });

      return updated ? nextStates : prevStates;
    });
  }, []);

  // Initialize with slot count
  useEffect(() => {
    if (slots.length !== slotCount) {
      setSlots(createEmptySlots(slotCount));
      setSlotStates(Array.from({ length: slotCount }, () => createSlotState()));
    }
  }, [slotCount, slots.length]);

  return {
    slotStates,
    addUser,
    removeUser,
    syncFromMoodCounts,
    tickAnimations,
    slots,
    lastDiff,
  };
}
