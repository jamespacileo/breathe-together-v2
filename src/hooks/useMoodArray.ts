/**
 * useMoodArray - Hook for managing a dynamic mood array with gentle transitions
 *
 * SIMPLIFIED (Dec 2024) - Veteran game dev approach:
 * - Single array in a ref (no React state for animation data)
 * - No duplicate data structures
 * - React only notified for UI-visible changes (userCount)
 * - Animation tick is pure: read ref, update in-place, done
 *
 * STABLE POSITIONS (Dec 2024):
 * - Each shard gets a stable positionIndex that doesn't change
 * - When shards are added/removed, other shards don't move
 * - Eliminates jarring "Fibonacci redistribution" glitch
 */

import { useCallback, useRef, useState } from 'react';
import { MOOD_IDS, type MoodId } from '../constants';

/** Maximum slots - used for stable Fibonacci distribution */
const MAX_SLOTS = 150;

/**
 * Shard state - combines animation + render data in one place
 */
export interface ShardAnimationState {
  mood: MoodId;
  state: 'entering' | 'idle' | 'exiting';
  opacity: number;
  /** Stable position index (0 to MAX_SLOTS-1) - doesn't change after creation */
  positionIndex: number;
  /** Animation start time (internal) */
  startTime: number;
}

export interface UseMoodArrayConfig {
  /** Duration of fade animations in seconds @default 0.4 */
  animationDuration?: number;
  /** Initial mood array @default [] */
  initialMoods?: MoodId[];
}

/**
 * Generate a randomized mood array
 */
export function generateRandomMoods(count: number): MoodId[] {
  return Array.from({ length: count }, () => MOOD_IDS[Math.floor(Math.random() * MOOD_IDS.length)]);
}

export interface UseMoodArrayResult {
  /** Current shard states for rendering (read directly from ref) */
  shardStates: ShardAnimationState[];
  /** Current mood array (source of truth) */
  moods: MoodId[];
  /** Update the mood array */
  setMoods: (newMoods: MoodId[]) => void;
  /** Add a single user with specified mood */
  addUser: (mood: MoodId) => void;
  /** Remove user at index */
  removeUser: (index: number) => void;
  /** Tick animations (call from useFrame) */
  tickAnimations: () => void;
  /** Count of visible shards (includes exiting) */
  visibleCount: number;
  /** Count of actual users (excludes exiting) */
  userCount: number;
}

/**
 * Simplified hook - single ref array, minimal React interaction
 */
export function useMoodArray(config: UseMoodArrayConfig = {}): UseMoodArrayResult {
  const { animationDuration = 0.4, initialMoods = [] } = config;

  // Track available position indices (those not in use)
  // Initialized with all slots available, then removes initial moods
  const availableIndicesRef = useRef<Set<number>>(null!);
  const shardsRef = useRef<ShardAnimationState[]>(null!);

  // One-time initialization (runs synchronously before any callbacks)
  if (availableIndicesRef.current === null) {
    const available = new Set(Array.from({ length: MAX_SLOTS }, (_, i) => i));
    const shards = initialMoods.map((mood, i) => {
      available.delete(i);
      return {
        mood,
        state: 'idle' as const,
        opacity: 1,
        positionIndex: i,
        startTime: 0,
      };
    });
    availableIndicesRef.current = available;
    shardsRef.current = shards;
  }

  // Stable helper functions (only access refs, never change identity)
  const getNextIndex = useCallback((): number => {
    const available = availableIndicesRef.current!;
    if (available.size === 0) return Math.floor(Math.random() * MAX_SLOTS);
    const idx = available.values().next().value as number;
    available.delete(idx);
    return idx;
  }, []);

  const returnIndex = useCallback((idx: number) => {
    availableIndicesRef.current!.add(idx);
  }, []);

  const durationRef = useRef(animationDuration);

  // React state ONLY for userCount display (triggers re-render for UI)
  // This is the only thing React needs to know about
  const [userCount, setUserCount] = useState(initialMoods.length);

  /**
   * Update the mood array with gentle fade transitions
   */
  const setMoods = useCallback(
    (newMoods: MoodId[]) => {
      const now = performance.now() / 1000;
      const prev = shardsRef.current;
      const next: ShardAnimationState[] = [];

      // Keep active (non-exiting) shards
      const active = prev.filter((s) => s.state !== 'exiting');
      const oldLen = active.length;
      const newLen = newMoods.length;

      // Process new moods
      for (let i = 0; i < newLen; i++) {
        if (i < oldLen) {
          // Update existing - keep position and animation state
          next.push({ ...active[i], mood: newMoods[i] });
        } else {
          // New shard - fade in with new stable position
          next.push({
            mood: newMoods[i],
            state: 'entering',
            opacity: 0,
            positionIndex: getNextIndex(),
            startTime: now,
          });
        }
      }

      // Mark removed as exiting (keep their stable positions until animation completes)
      for (let i = newLen; i < oldLen; i++) {
        next.push({
          ...active[i],
          state: 'exiting',
          startTime: now,
        });
      }

      // Keep already exiting shards
      for (const s of prev) {
        if (s.state === 'exiting' && !next.includes(s)) {
          next.push(s);
        }
      }

      shardsRef.current = next;
      setUserCount(newLen);
    },
    [getNextIndex],
  );

  /**
   * Add a single user
   */
  const addUser = useCallback(
    (mood: MoodId) => {
      const now = performance.now() / 1000;
      const shards = shardsRef.current;

      // Insert new shard before exiting ones (keeps array order stable)
      const activeEnd = shards.findIndex((s) => s.state === 'exiting');
      const insertIndex = activeEnd === -1 ? shards.length : activeEnd;

      const newShard: ShardAnimationState = {
        mood,
        state: 'entering',
        opacity: 0,
        positionIndex: getNextIndex(),
        startTime: now,
      };

      shardsRef.current = [...shards.slice(0, insertIndex), newShard, ...shards.slice(insertIndex)];

      setUserCount((prev) => prev + 1);
    },
    [getNextIndex],
  );

  /**
   * Remove user at index
   */
  const removeUser = useCallback((index: number) => {
    const shards = shardsRef.current;
    const active = shards.filter((s) => s.state !== 'exiting');

    if (index < 0 || index >= active.length) return;

    const now = performance.now() / 1000;

    // Mark the shard as exiting
    active[index] = { ...active[index], state: 'exiting', startTime: now };

    // Rebuild array with exiting items at the end
    shardsRef.current = [
      ...active.filter((s) => s.state !== 'exiting'),
      ...shards.filter((s) => s.state === 'exiting'),
      active[index],
    ];

    setUserCount((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * Tick - simple and fast
   * Updates opacity in-place, removes completed exits
   */
  const tickAnimations = useCallback(() => {
    const now = performance.now() / 1000;
    const duration = durationRef.current;
    const shards = shardsRef.current;

    let needsCleanup = false;
    const indicesToReturn: number[] = [];

    // Single pass: update all animations in-place
    for (const s of shards) {
      if (s.state === 'idle') continue;

      const elapsed = now - s.startTime;
      const t = Math.min(elapsed / duration, 1);

      if (t >= 1) {
        if (s.state === 'exiting') {
          needsCleanup = true;
          indicesToReturn.push(s.positionIndex);
        } else {
          // Entering complete -> idle
          s.state = 'idle';
          s.opacity = 1;
        }
      } else {
        // Ease-out for entering, ease-in for exiting
        s.opacity = s.state === 'entering' ? 1 - (1 - t) * (1 - t) : (1 - t) * (1 - t);
      }
    }

    // Remove completed exits and return their position indices to the pool
    if (needsCleanup) {
      shardsRef.current = shards.filter((s) => !(s.state === 'exiting' && s.opacity <= 0.01));
      for (const idx of indicesToReturn) {
        returnIndex(idx);
      }
    }
  }, [returnIndex]);

  // Compute moods array from active shards (for compatibility)
  const moods = shardsRef.current.filter((s) => s.state !== 'exiting').map((s) => s.mood);

  return {
    shardStates: shardsRef.current,
    moods,
    setMoods,
    addUser,
    removeUser,
    tickAnimations,
    visibleCount: shardsRef.current.length,
    userCount,
  };
}
