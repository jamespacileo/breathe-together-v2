/**
 * useMoodArray - Hook for managing a dynamic mood array with smooth transitions
 *
 * Unlike useMoodSlots (fixed capacity), this hook works with a dynamic array
 * where the length changes as users join/leave. The array format matches
 * the future backend: `MoodId[]` with no null slots.
 *
 * **Key Features:**
 * - Dynamic count: No fixed capacity, count = array length
 * - Stable animations: Enter/exit animations for individual shards
 * - Position interpolation: Smooth transitions when indices shift
 *
 * **Animation Pattern:**
 * When the mood array updates:
 * 1. Diff old vs new arrays to find enters/exits/shifts
 * 2. Mark exiting shards (animate out over duration)
 * 3. Mark entering shards (animate in over duration)
 * 4. Existing shards animate to new positions via spring physics
 */

import { useCallback, useRef, useState } from 'react';
import { MOOD_IDS, type MoodId } from '../constants';

/**
 * State for each shard in the animation system
 */
export interface ShardAnimationState {
  /** The mood this shard represents */
  mood: MoodId;
  /** Animation state */
  state: 'entering' | 'idle' | 'exiting';
  /** Animation progress (0-1) */
  progress: number;
  /** Start time of current animation */
  startTime: number;
  /** Position index in the current array (for Fibonacci calculation) */
  positionIndex: number;
  /** Target position index (for smooth position transitions) */
  targetPositionIndex: number;
}

/**
 * Configuration for the hook
 */
export interface UseMoodArrayConfig {
  /** Duration of enter/exit animations in seconds @default 0.5 */
  animationDuration?: number;
  /** Initial mood array @default [] */
  initialMoods?: MoodId[];
}

/**
 * Generate a randomized mood array
 *
 * @param count - Number of users/moods to generate
 * @returns Array of random mood IDs
 */
export function generateRandomMoods(count: number): MoodId[] {
  return Array.from({ length: count }, () => MOOD_IDS[Math.floor(Math.random() * MOOD_IDS.length)]);
}

/**
 * Return type from the hook
 */
export interface UseMoodArrayResult {
  /** Current shard states for rendering */
  shardStates: ShardAnimationState[];
  /** Current mood array (source of truth) */
  moods: MoodId[];
  /** Update the mood array (triggers diffing and animations) */
  setMoods: (newMoods: MoodId[]) => void;
  /** Add a single user with specified mood */
  addUser: (mood: MoodId) => void;
  /** Remove user at index */
  removeUser: (index: number) => void;
  /** Tick animations (call from useFrame) */
  tickAnimations: (elapsedTime: number) => void;
  /** Count of visible shards (includes exiting) */
  visibleCount: number;
  /** Count of actual users (excludes exiting) */
  userCount: number;
}

/**
 * Hook for managing a dynamic mood array with smooth transitions
 */
export function useMoodArray(config: UseMoodArrayConfig = {}): UseMoodArrayResult {
  const { animationDuration = 0.5, initialMoods = [] } = config;

  // Source of truth: the mood array
  const [moods, setMoodsState] = useState<MoodId[]>(initialMoods);

  // Animation states for rendering (includes exiting shards)
  const [shardStates, setShardStates] = useState<ShardAnimationState[]>(() =>
    initialMoods.map((mood, index) => ({
      mood,
      state: 'idle' as const,
      progress: 1,
      startTime: 0,
      positionIndex: index,
      targetPositionIndex: index,
    })),
  );

  // Store animation duration in ref for use in tickAnimations
  const animationDurationRef = useRef(animationDuration);

  /**
   * Update the mood array with smooth transitions
   * Uses performance.now() for startTime - tickAnimations uses same time base
   */
  const setMoods = useCallback((newMoods: MoodId[]) => {
    setMoodsState(newMoods);

    setShardStates((prevStates) => {
      const now = performance.now() / 1000;
      const nextStates: ShardAnimationState[] = [];

      // Get currently visible moods (excluding exiting)
      const activeStates = prevStates.filter((s) => s.state !== 'exiting');

      // Simple diff: compare lengths and contents
      const oldLength = activeStates.length;
      const newLength = newMoods.length;

      // Process each new mood
      for (let i = 0; i < newLength; i++) {
        const newMood = newMoods[i];

        if (i < oldLength) {
          // Existing position - update mood and target position
          const existing = activeStates[i];
          nextStates.push({
            mood: newMood,
            state: existing.state,
            progress: existing.progress,
            startTime: existing.startTime,
            positionIndex: existing.positionIndex,
            targetPositionIndex: i,
          });
        } else {
          // New position - enter animation
          nextStates.push({
            mood: newMood,
            state: 'entering',
            progress: 0,
            startTime: now,
            positionIndex: i,
            targetPositionIndex: i,
          });
        }
      }

      // Mark removed positions as exiting
      for (let i = newLength; i < oldLength; i++) {
        const existing = activeStates[i];
        nextStates.push({
          mood: existing.mood,
          state: 'exiting',
          progress: 1,
          startTime: now,
          positionIndex: existing.positionIndex,
          targetPositionIndex: existing.positionIndex, // Stay in place while exiting
        });
      }

      // Keep already exiting shards (don't duplicate)
      for (const state of prevStates) {
        if (state.state === 'exiting' && !nextStates.some((s) => s === state)) {
          nextStates.push(state);
        }
      }

      return nextStates;
    });
  }, []);

  /**
   * Add a user with specified mood
   * Uses functional update to avoid stale closure issues
   */
  const addUser = useCallback((mood: MoodId) => {
    setMoodsState((prevMoods) => {
      const newMoods = [...prevMoods, mood];
      // Trigger animation state update
      setShardStates((prevStates) => {
        const now = performance.now() / 1000;
        return [
          ...prevStates.filter((s) => s.state !== 'exiting'),
          {
            mood,
            state: 'entering' as const,
            progress: 0,
            startTime: now,
            positionIndex: prevMoods.length,
            targetPositionIndex: prevMoods.length,
          },
          ...prevStates.filter((s) => s.state === 'exiting'),
        ];
      });
      return newMoods;
    });
  }, []);

  /**
   * Remove user at index
   * Uses functional update to avoid stale closure issues
   */
  const removeUser = useCallback((index: number) => {
    setMoodsState((prevMoods) => {
      if (index < 0 || index >= prevMoods.length) return prevMoods;
      const newMoods = [...prevMoods];
      newMoods.splice(index, 1);

      // Trigger animation state update
      setShardStates((prevStates) => {
        const now = performance.now() / 1000;
        const activeStates = prevStates.filter((s) => s.state !== 'exiting');

        // Mark the removed shard as exiting
        const exitingShard = activeStates[index];
        const nextStates: ShardAnimationState[] = [];

        for (let i = 0; i < activeStates.length; i++) {
          if (i === index) {
            // This one is exiting
            nextStates.push({
              ...exitingShard,
              state: 'exiting',
              progress: 1,
              startTime: now,
            });
          } else if (i > index) {
            // Shift indices for items after the removed one
            nextStates.push({
              ...activeStates[i],
              targetPositionIndex: i - 1,
            });
          } else {
            nextStates.push(activeStates[i]);
          }
        }

        // Keep existing exiting shards
        for (const state of prevStates) {
          if (state.state === 'exiting' && state !== exitingShard) {
            nextStates.push(state);
          }
        }

        return nextStates;
      });

      return newMoods;
    });
  }, []);

  /**
   * Tick animations (call from useFrame)
   * Uses performance.now() to match startTime time base (ignores elapsedTime param)
   */
  const tickAnimations = useCallback((_elapsedTime: number) => {
    const now = performance.now() / 1000;
    const duration = animationDurationRef.current;

    setShardStates((prevStates) => {
      let updated = false;

      const nextStates = prevStates
        .map((state) => {
          if (state.state === 'idle') {
            // Interpolate position toward target
            if (state.positionIndex !== state.targetPositionIndex) {
              updated = true;
              const positionDelta = state.targetPositionIndex - state.positionIndex;
              const step = Math.sign(positionDelta) * Math.min(Math.abs(positionDelta), 0.1);
              return {
                ...state,
                positionIndex:
                  Math.abs(state.positionIndex - state.targetPositionIndex) < 0.01
                    ? state.targetPositionIndex
                    : state.positionIndex + step,
              };
            }
            return state;
          }

          // Calculate animation progress using performance.now() time base
          const elapsed = now - state.startTime;
          const progress = Math.min(elapsed / duration, 1);

          if (progress >= 1) {
            updated = true;
            if (state.state === 'exiting') {
              return null; // Remove exited shards
            }
            return {
              ...state,
              state: 'idle' as const,
              progress: 1,
            };
          }

          updated = true;
          return {
            ...state,
            progress: state.state === 'entering' ? progress : 1 - progress,
          };
        })
        .filter((s): s is ShardAnimationState => s !== null);

      return updated ? nextStates : prevStates;
    });
  }, []);

  const visibleCount = shardStates.length;
  const userCount = moods.length;

  return {
    shardStates,
    moods,
    setMoods,
    addUser,
    removeUser,
    tickAnimations,
    visibleCount,
    userCount,
  };
}
