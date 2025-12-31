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
 * - NO RE-RENDERS during animation ticks (uses refs for progress)
 *
 * **Animation Pattern:**
 * When the mood array updates:
 * 1. Diff old vs new arrays to find enters/exits/shifts
 * 2. Mark exiting shards (animate out over duration)
 * 3. Mark entering shards (animate in with staggered timing)
 * 4. Existing shards animate to new positions via spring physics
 *
 * **Performance Note (Dec 2024):**
 * Animation progress is stored in refs, not React state. This prevents
 * re-renders during animation ticks which was causing glitchy updates
 * to other scene elements (clouds, environment, etc.)
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
  /** Animation progress (0-1) - read from ref during tick, not from state */
  progress: number;
  /** Start time of current animation (staggered for organic feel) */
  startTime: number;
  /** Position index in the current array (for Fibonacci calculation) */
  positionIndex: number;
  /** Target position index (for smooth position transitions) */
  targetPositionIndex: number;
}

/**
 * Internal animation data stored in refs (no re-renders)
 */
interface ShardAnimationRef {
  mood: MoodId;
  state: 'entering' | 'idle' | 'exiting';
  progress: number;
  startTime: number;
  positionIndex: number;
  targetPositionIndex: number;
  /** Unique ID for stable tracking */
  id: number;
}

/**
 * Configuration for the hook
 */
export interface UseMoodArrayConfig {
  /** Duration of enter/exit animations in seconds @default 0.5 */
  animationDuration?: number;
  /** Initial mood array @default [] */
  initialMoods?: MoodId[];
  /** Stagger delay between batch animations in seconds @default 0.05 */
  staggerDelay?: number;
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
  /** Current shard states for rendering (rebuilt each tick from refs) */
  shardStates: ShardAnimationState[];
  /** Current mood array (source of truth) */
  moods: MoodId[];
  /** Update the mood array (triggers diffing and animations) */
  setMoods: (newMoods: MoodId[]) => void;
  /** Add a single user with specified mood */
  addUser: (mood: MoodId) => void;
  /** Remove user at index */
  removeUser: (index: number) => void;
  /** Tick animations (call from useFrame) - updates refs, not state */
  tickAnimations: (elapsedTime: number) => void;
  /** Count of visible shards (includes exiting) */
  visibleCount: number;
  /** Count of actual users (excludes exiting) */
  userCount: number;
}

/** Unique ID counter for shard tracking */
let nextShardId = 0;

/**
 * Hook for managing a dynamic mood array with smooth transitions
 *
 * **Performance:** Animation progress is stored in refs to avoid re-renders.
 * Only structural changes (enter/exit/add/remove) trigger React updates.
 */
export function useMoodArray(config: UseMoodArrayConfig = {}): UseMoodArrayResult {
  const { animationDuration = 0.5, initialMoods = [], staggerDelay = 0.05 } = config;

  // Source of truth: the mood array (React state for structural changes only)
  const [moods, setMoodsState] = useState<MoodId[]>(initialMoods);

  // Animation data in refs (no re-renders during tick)
  const animationDataRef = useRef<ShardAnimationRef[]>(
    initialMoods.map((mood, index) => ({
      mood,
      state: 'idle' as const,
      progress: 1,
      startTime: 0,
      positionIndex: index,
      targetPositionIndex: index,
      id: nextShardId++,
    })),
  );

  // Rebuilt each tick for consumers (avoids stale closures)
  const shardStatesRef = useRef<ShardAnimationState[]>(
    initialMoods.map((mood, index) => ({
      mood,
      state: 'idle' as const,
      progress: 1,
      startTime: 0,
      positionIndex: index,
      targetPositionIndex: index,
    })),
  );

  // Store config in refs for use in callbacks
  const animationDurationRef = useRef(animationDuration);
  const staggerDelayRef = useRef(staggerDelay);

  // Force re-render trigger (only when structure changes, not every tick)
  const [, forceUpdate] = useState(0);

  /**
   * Update the mood array with smooth transitions
   * Uses performance.now() for startTime with staggered delays for organic feel
   */
  const setMoods = useCallback((newMoods: MoodId[]) => {
    setMoodsState(newMoods);

    const now = performance.now() / 1000;
    const prevData = animationDataRef.current;
    const nextData: ShardAnimationRef[] = [];

    // Get currently active (non-exiting) shards
    const activeData = prevData.filter((s) => s.state !== 'exiting');
    const oldLength = activeData.length;
    const newLength = newMoods.length;

    // Track how many new entries for staggering
    let enterIndex = 0;

    // Process each new mood
    for (let i = 0; i < newLength; i++) {
      const newMood = newMoods[i];

      if (i < oldLength) {
        // Existing position - update mood and target position
        const existing = activeData[i];
        nextData.push({
          ...existing,
          mood: newMood,
          targetPositionIndex: i,
        });
      } else {
        // New position - enter animation with staggered timing
        const staggeredStartTime = now + enterIndex * staggerDelayRef.current;
        enterIndex++;

        nextData.push({
          mood: newMood,
          state: 'entering',
          progress: 0,
          startTime: staggeredStartTime,
          positionIndex: i,
          targetPositionIndex: i,
          id: nextShardId++,
        });
      }
    }

    // Mark removed positions as exiting (also staggered)
    let exitIndex = 0;
    for (let i = newLength; i < oldLength; i++) {
      const existing = activeData[i];
      const staggeredStartTime = now + exitIndex * staggerDelayRef.current;
      exitIndex++;

      nextData.push({
        ...existing,
        state: 'exiting',
        progress: 1,
        startTime: staggeredStartTime,
      });
    }

    // Keep already exiting shards
    for (const data of prevData) {
      if (data.state === 'exiting' && !nextData.some((s) => s.id === data.id)) {
        nextData.push(data);
      }
    }

    animationDataRef.current = nextData;
    forceUpdate((n) => n + 1); // Trigger re-render for structural change
  }, []);

  /**
   * Add a user with specified mood
   */
  const addUser = useCallback((mood: MoodId) => {
    setMoodsState((prevMoods) => {
      const newMoods = [...prevMoods, mood];

      const now = performance.now() / 1000;
      const prevData = animationDataRef.current;

      // Add new entering shard
      animationDataRef.current = [
        ...prevData.filter((s) => s.state !== 'exiting'),
        {
          mood,
          state: 'entering' as const,
          progress: 0,
          startTime: now,
          positionIndex: prevMoods.length,
          targetPositionIndex: prevMoods.length,
          id: nextShardId++,
        },
        ...prevData.filter((s) => s.state === 'exiting'),
      ];

      forceUpdate((n) => n + 1);
      return newMoods;
    });
  }, []);

  /**
   * Remove user at index
   */
  const removeUser = useCallback((index: number) => {
    setMoodsState((prevMoods) => {
      if (index < 0 || index >= prevMoods.length) return prevMoods;

      const newMoods = [...prevMoods];
      newMoods.splice(index, 1);

      const now = performance.now() / 1000;
      const prevData = animationDataRef.current;
      const activeData = prevData.filter((s) => s.state !== 'exiting');

      const nextData: ShardAnimationRef[] = [];

      for (let i = 0; i < activeData.length; i++) {
        if (i === index) {
          // This one is exiting
          nextData.push({
            ...activeData[i],
            state: 'exiting',
            progress: 1,
            startTime: now,
          });
        } else if (i > index) {
          // Shift indices for items after the removed one
          nextData.push({
            ...activeData[i],
            targetPositionIndex: i - 1,
          });
        } else {
          nextData.push(activeData[i]);
        }
      }

      // Keep existing exiting shards
      for (const data of prevData) {
        if (data.state === 'exiting' && data !== activeData[index]) {
          nextData.push(data);
        }
      }

      animationDataRef.current = nextData;
      forceUpdate((n) => n + 1);
      return newMoods;
    });
  }, []);

  /**
   * Tick animations (call from useFrame)
   *
   * IMPORTANT: This updates REFS, not React state.
   * This prevents re-renders on every frame which was causing
   * glitchy updates to other scene elements.
   */
  const tickAnimations = useCallback((_elapsedTime: number) => {
    const now = performance.now() / 1000;
    const duration = animationDurationRef.current;
    const data = animationDataRef.current;

    let structureChanged = false;

    // Update animation progress in refs (no setState = no re-render)
    const updatedData = data
      .map((shard) => {
        if (shard.state === 'idle') {
          // Interpolate position toward target (spring-like)
          if (shard.positionIndex !== shard.targetPositionIndex) {
            const positionDelta = shard.targetPositionIndex - shard.positionIndex;
            const step = Math.sign(positionDelta) * Math.min(Math.abs(positionDelta), 0.1);
            const newPosition =
              Math.abs(shard.positionIndex - shard.targetPositionIndex) < 0.01
                ? shard.targetPositionIndex
                : shard.positionIndex + step;

            return { ...shard, positionIndex: newPosition };
          }
          return shard;
        }

        // Calculate animation progress
        const elapsed = now - shard.startTime;
        // Handle staggered start (negative elapsed = hasn't started yet)
        if (elapsed < 0) {
          return shard;
        }

        const progress = Math.min(elapsed / duration, 1);

        if (progress >= 1) {
          structureChanged = true;
          if (shard.state === 'exiting') {
            return null; // Remove exited shards
          }
          return {
            ...shard,
            state: 'idle' as const,
            progress: 1,
          };
        }

        // Apply easing for organic feel (easeOutQuad for enter, easeInQuad for exit)
        const easedProgress =
          shard.state === 'entering'
            ? 1 - (1 - progress) * (1 - progress) // easeOutQuad
            : progress * progress; // easeInQuad

        return {
          ...shard,
          progress: shard.state === 'entering' ? easedProgress : 1 - easedProgress,
        };
      })
      .filter((s): s is ShardAnimationRef => s !== null);

    animationDataRef.current = updatedData;

    // Update shardStates ref for consumers
    shardStatesRef.current = updatedData.map((d) => ({
      mood: d.mood,
      state: d.state,
      progress: d.progress,
      startTime: d.startTime,
      positionIndex: d.positionIndex,
      targetPositionIndex: d.targetPositionIndex,
    }));

    // Only trigger re-render if structure changed (animation completed)
    if (structureChanged) {
      forceUpdate((n) => n + 1);
    }
  }, []);

  // Return shardStates from ref (updated each tick without re-renders)
  const visibleCount = shardStatesRef.current.length;
  const userCount = moods.length;

  return {
    shardStates: shardStatesRef.current,
    moods,
    setMoods,
    addUser,
    removeUser,
    tickAnimations,
    visibleCount,
    userCount,
  };
}
