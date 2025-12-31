/**
 * useMoodArray - Hook for managing a dynamic mood array with gentle transitions
 *
 * Simplified approach (Dec 2024):
 * - Just tracks mood + opacity for each shard
 * - ParticleSwarm handles positions via Fibonacci sphere
 * - Gentle opacity fade in/out, no complex animations
 * - NO RE-RENDERS during animation ticks (uses refs for opacity)
 *
 * React 19 optimizations:
 * - Uses useTransition for non-blocking mood updates
 * - Single state update per operation (removed double update pattern)
 * - Deferred forceUpdate during animation completion
 */

import { useCallback, useRef, useState, useTransition } from 'react';
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
  // React 19: Use transition to mark mood updates as non-blocking
  // This prevents UI stuttering when mood changes happen during animations
  const [, startTransition] = useTransition();

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
  // Version counter for structural changes only (when items are removed from shardsRef)
  const [, forceUpdate] = useState(0);

  /**
   * Update the mood array with gentle fade transitions
   * React 19: Uses startTransition for non-blocking updates
   */
  const setMoods = useCallback(
    (newMoods: MoodId[]) => {
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

      // Update ref FIRST, then trigger single state update
      shardsRef.current = next;

      // Use startTransition for non-blocking update
      startTransition(() => {
        setMoodsState(newMoods);
      });
    },
    [], // startTransition is stable, no deps needed
  );

  /**
   * Add a single user - uses startTransition for non-blocking update
   */
  const addUser = useCallback(
    (mood: MoodId) => {
      const now = performance.now() / 1000;
      const shards = shardsRef.current;

      // Update ref synchronously (needed for next frame's render)
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

      // Non-blocking state update - won't stutter animations
      startTransition(() => {
        setMoodsState((prev) => [...prev, mood]);
      });
    },
    [], // startTransition is stable, no deps needed
  );

  /**
   * Remove user at index - uses startTransition for non-blocking update
   */
  const removeUser = useCallback(
    (index: number) => {
      // Early validation
      const currentMoods = shardsRef.current.filter((s) => s.state !== 'exiting');
      if (index < 0 || index >= currentMoods.length) return;

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

      // Update ref synchronously
      shardsRef.current = next;

      // Non-blocking state update
      startTransition(() => {
        setMoodsState((prev) => {
          if (index < 0 || index >= prev.length) return prev;
          const newMoods = [...prev];
          newMoods.splice(index, 1);
          return newMoods;
        });
      });
    },
    [], // startTransition is stable, no deps needed
  );

  /**
   * Tick - update opacity in-place, avoid array allocations
   * Only creates new arrays when structure changes (items removed)
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Performance-critical animation loop requires in-place updates with multiple conditions to avoid GC pressure from array allocations every frame
  const tickAnimations = useCallback(() => {
    const now = performance.now() / 1000;
    const duration = durationRef.current;
    const shards = shardsRef.current;

    let structureChanged = false;
    let anyAnimating = false;

    // First pass: update in-place, mark items for removal
    // biome-ignore lint/style/useForOf: Need index for in-place mutation of shards array
    for (let i = 0; i < shards.length; i++) {
      const s = shards[i];
      if (s.state === 'idle') continue;

      anyAnimating = true;
      const elapsed = now - s.startTime;
      const t = Math.min(elapsed / duration, 1);

      // Simple ease-out for entering, ease-in for exiting
      const eased = s.state === 'entering' ? 1 - (1 - t) * (1 - t) : (1 - t) * (1 - t);

      if (t >= 1) {
        if (s.state === 'exiting') {
          // Mark for removal (will filter in second pass)
          structureChanged = true;
        } else {
          // Transition to idle in-place
          s.state = 'idle';
          s.opacity = 1;
        }
      } else {
        // Update opacity in-place
        s.opacity = eased;
      }
    }

    // Second pass: only create new array if structure changed (items removed)
    if (structureChanged) {
      shardsRef.current = shards.filter(
        (s) => !(s.state === 'exiting' && now - s.startTime >= duration),
      );
    }

    // Update exposed states - only rebuild if animating or structure changed
    // When idle, statesRef already has correct values
    if (anyAnimating || structureChanged) {
      const current = shardsRef.current;
      // Resize statesRef array to match (reuse existing array when possible)
      if (statesRef.current.length !== current.length) {
        statesRef.current = new Array(current.length);
      }
      for (let i = 0; i < current.length; i++) {
        const s = current[i];
        const existing = statesRef.current[i];
        if (existing && existing.mood === s.mood && existing.state === s.state) {
          // Just update opacity in-place
          existing.opacity = s.opacity;
        } else {
          // Create new state object only when needed
          statesRef.current[i] = {
            mood: s.mood,
            state: s.state,
            opacity: s.opacity,
          };
        }
      }
    }

    // Use startTransition for structural changes to avoid blocking animations
    if (structureChanged) {
      startTransition(() => {
        forceUpdate((n) => n + 1);
      });
    }
  }, []); // startTransition is stable, no deps needed

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
