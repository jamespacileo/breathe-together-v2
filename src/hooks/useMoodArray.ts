/**
 * useMoodArray - Hook for managing a dynamic mood array with gentle transitions
 *
 * Simplified approach (Dec 2024):
 * - Just tracks mood + opacity for each shard
 * - ParticleSwarm handles positions via Fibonacci sphere
 * - Gentle opacity fade in/out, no complex animations
 * - NO RE-RENDERS during animation ticks (uses refs for opacity)
 */

import { useCallback, useRef, useState } from 'react';
import { MOOD_IDS, type MoodId } from '../constants';

/**
 * Simplified shard state - just mood and visibility
 */
export interface ShardAnimationState {
  /** The mood this shard represents */
  mood: MoodId;
  /** Animation state */
  state: 'entering' | 'idle' | 'exiting';
  /** Opacity (0-1) - used for gentle fade in/out */
  opacity: number;
}

/**
 * Internal animation data stored in refs (no re-renders)
 */
interface ShardRef {
  mood: MoodId;
  state: 'entering' | 'idle' | 'exiting';
  opacity: number;
  startTime: number;
  id: number;
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
  /** Current shard states for rendering */
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
  tickAnimations: (elapsedTime: number) => void;
  /** Count of visible shards (includes exiting) */
  visibleCount: number;
  /** Count of actual users (excludes exiting) */
  userCount: number;
}

let nextShardId = 0;

/**
 * Simplified hook - just opacity fades, ParticleSwarm handles positions
 */
export function useMoodArray(config: UseMoodArrayConfig = {}): UseMoodArrayResult {
  const { animationDuration = 0.4, initialMoods = [] } = config;

  const [moods, setMoodsState] = useState<MoodId[]>(initialMoods);

  // Animation data in refs (no re-renders during tick)
  const shardsRef = useRef<ShardRef[]>(
    initialMoods.map((mood) => ({
      mood,
      state: 'idle' as const,
      opacity: 1,
      startTime: 0,
      id: nextShardId++,
    })),
  );

  // Exposed states (rebuilt each tick)
  const statesRef = useRef<ShardAnimationState[]>(
    initialMoods.map((mood) => ({
      mood,
      state: 'idle' as const,
      opacity: 1,
    })),
  );

  const durationRef = useRef(animationDuration);
  const [, forceUpdate] = useState(0);

  /**
   * Update the mood array with gentle fade transitions
   */
  const setMoods = useCallback((newMoods: MoodId[]) => {
    setMoodsState(newMoods);

    const now = performance.now() / 1000;
    const prev = shardsRef.current;
    const next: ShardRef[] = [];

    // Keep active (non-exiting) shards
    const active = prev.filter((s) => s.state !== 'exiting');
    const oldLen = active.length;
    const newLen = newMoods.length;

    // Process new moods
    for (let i = 0; i < newLen; i++) {
      if (i < oldLen) {
        // Update existing
        next.push({ ...active[i], mood: newMoods[i] });
      } else {
        // New shard - fade in
        next.push({
          mood: newMoods[i],
          state: 'entering',
          opacity: 0,
          startTime: now,
          id: nextShardId++,
        });
      }
    }

    // Mark removed as exiting
    for (let i = newLen; i < oldLen; i++) {
      next.push({
        ...active[i],
        state: 'exiting',
        startTime: now,
      });
    }

    // Keep already exiting
    for (const s of prev) {
      if (s.state === 'exiting' && !next.some((n) => n.id === s.id)) {
        next.push(s);
      }
    }

    shardsRef.current = next;
    forceUpdate((n) => n + 1);
  }, []);

  const addUser = useCallback((mood: MoodId) => {
    setMoodsState((prev) => {
      const now = performance.now() / 1000;
      const shards = shardsRef.current;

      shardsRef.current = [
        ...shards.filter((s) => s.state !== 'exiting'),
        {
          mood,
          state: 'entering' as const,
          opacity: 0,
          startTime: now,
          id: nextShardId++,
        },
        ...shards.filter((s) => s.state === 'exiting'),
      ];

      forceUpdate((n) => n + 1);
      return [...prev, mood];
    });
  }, []);

  const removeUser = useCallback((index: number) => {
    setMoodsState((prev) => {
      if (index < 0 || index >= prev.length) return prev;

      const now = performance.now() / 1000;
      const shards = shardsRef.current;
      const active = shards.filter((s) => s.state !== 'exiting');

      const next: ShardRef[] = [];
      for (let i = 0; i < active.length; i++) {
        if (i === index) {
          next.push({ ...active[i], state: 'exiting', startTime: now });
        } else {
          next.push(active[i]);
        }
      }

      // Keep already exiting
      for (const s of shards) {
        if (s.state === 'exiting' && s !== active[index]) {
          next.push(s);
        }
      }

      shardsRef.current = next;
      forceUpdate((n) => n + 1);

      const newMoods = [...prev];
      newMoods.splice(index, 1);
      return newMoods;
    });
  }, []);

  /**
   * Tick - just update opacity, very simple
   */
  const tickAnimations = useCallback(() => {
    const now = performance.now() / 1000;
    const duration = durationRef.current;
    const shards = shardsRef.current;

    let changed = false;

    const updated = shards
      .map((s) => {
        if (s.state === 'idle') return s;

        const elapsed = now - s.startTime;
        const t = Math.min(elapsed / duration, 1);

        // Simple ease-out for entering, ease-in for exiting
        const eased = s.state === 'entering' ? 1 - (1 - t) * (1 - t) : (1 - t) * (1 - t);

        if (t >= 1) {
          changed = true;
          if (s.state === 'exiting') return null;
          return { ...s, state: 'idle' as const, opacity: 1 };
        }

        return { ...s, opacity: eased };
      })
      .filter((s): s is ShardRef => s !== null);

    shardsRef.current = updated;

    // Update exposed states
    statesRef.current = updated.map((s) => ({
      mood: s.mood,
      state: s.state,
      opacity: s.opacity,
    }));

    if (changed) forceUpdate((n) => n + 1);
  }, []);

  return {
    shardStates: statesRef.current,
    moods,
    setMoods,
    addUser,
    removeUser,
    tickAnimations,
    visibleCount: statesRef.current.length,
    userCount: moods.length,
  };
}
