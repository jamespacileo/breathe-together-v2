/**
 * useUserOrdering - Manages ordered mood array with smooth transitions
 *
 * Game dev pattern: Slot-based system with animation queues
 * - Fixed slot count (positions never change)
 * - Mood array maps to slot colors
 * - Detects changes and generates animation commands
 * - Handles rapid updates gracefully (lerping blends naturally)
 */

import { useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';

/**
 * Mood ID to palette color mapping (0-3 mood indices)
 * Direct 1:1 mapping - each mood has exactly one color
 */
const MOOD_INDEX_TO_COLOR: THREE.Color[] = [
  new THREE.Color(MONUMENT_VALLEY_PALETTE.gratitude), // 0: gratitude (gold)
  new THREE.Color(MONUMENT_VALLEY_PALETTE.presence), // 1: presence (teal)
  new THREE.Color(MONUMENT_VALLEY_PALETTE.release), // 2: release (blue)
  new THREE.Color(MONUMENT_VALLEY_PALETTE.connection), // 3: connection (rose)
];

/** Mood ID string to index mapping */
export const MOOD_ID_TO_INDEX: Record<MoodId, number> = {
  gratitude: 0,
  presence: 1,
  release: 2,
  connection: 3,
};

/** Index to mood ID mapping (reverse lookup) */
export const INDEX_TO_MOOD_ID: MoodId[] = ['gratitude', 'presence', 'release', 'connection'];

/** Empty slot marker */
export const EMPTY_SLOT = -1;

/**
 * Animation command types for slot transitions
 */
export type SlotAnimationCommand =
  | { type: 'color_change'; slotIndex: number; fromColor: THREE.Color; toColor: THREE.Color }
  | { type: 'enter'; slotIndex: number; moodIndex: number }
  | { type: 'exit'; slotIndex: number };

/**
 * Get color for a mood index
 * Returns a random palette color for empty slots (visual consistency)
 */
export function getMoodColor(moodIndex: number): THREE.Color {
  if (moodIndex < 0 || moodIndex >= MOOD_INDEX_TO_COLOR.length) {
    // Return random palette color for empty/invalid slots
    return MOOD_INDEX_TO_COLOR[Math.floor(Math.random() * MOOD_INDEX_TO_COLOR.length)];
  }
  return MOOD_INDEX_TO_COLOR[moodIndex];
}

/**
 * Get a deterministic fallback color for a slot (based on slot index)
 * Used when slot is empty to maintain visual consistency
 */
export function getSlotFallbackColor(slotIndex: number): THREE.Color {
  return MOOD_INDEX_TO_COLOR[slotIndex % MOOD_INDEX_TO_COLOR.length];
}

/**
 * Convert presence data (mood counts) to ordered mood array
 *
 * Maintains order stability: existing users keep their positions,
 * new users are appended, removed users create gaps that get filled.
 *
 * @param users - Mood distribution (e.g., { grateful: 5, moment: 3 })
 * @param maxSlots - Maximum number of slots
 * @returns Array where index = slot, value = mood index (-1 for empty)
 */
export function presenceToMoodArray(
  users: Partial<Record<MoodId, number>> | undefined,
  maxSlots: number,
): number[] {
  if (!users) {
    return new Array(maxSlots).fill(EMPTY_SLOT);
  }

  const result: number[] = [];

  // Expand mood counts into ordered array
  for (const [moodId, count] of Object.entries(users)) {
    const moodIndex = MOOD_ID_TO_INDEX[moodId as MoodId];
    if (moodIndex !== undefined && count) {
      for (let i = 0; i < count; i++) {
        result.push(moodIndex);
      }
    }
  }

  // Pad with empty slots if needed
  while (result.length < maxSlots) {
    result.push(EMPTY_SLOT);
  }

  // Truncate if over capacity
  return result.slice(0, maxSlots);
}

/**
 * Compare two mood arrays and generate animation commands
 *
 * Detects:
 * - Color changes (mood changed for existing slot)
 * - Entries (empty slot now has user)
 * - Exits (occupied slot now empty)
 */
export function diffMoodArrays(oldArray: number[], newArray: number[]): SlotAnimationCommand[] {
  const commands: SlotAnimationCommand[] = [];
  const length = Math.max(oldArray.length, newArray.length);

  for (let i = 0; i < length; i++) {
    const oldMood = oldArray[i] ?? EMPTY_SLOT;
    const newMood = newArray[i] ?? EMPTY_SLOT;

    if (oldMood === newMood) continue;

    if (oldMood === EMPTY_SLOT && newMood !== EMPTY_SLOT) {
      // Slot was empty, now has user -> enter animation
      commands.push({ type: 'enter', slotIndex: i, moodIndex: newMood });
    } else if (oldMood !== EMPTY_SLOT && newMood === EMPTY_SLOT) {
      // Slot had user, now empty -> exit animation
      commands.push({ type: 'exit', slotIndex: i });
    } else {
      // Both have users but different moods -> color change
      commands.push({
        type: 'color_change',
        slotIndex: i,
        fromColor: getMoodColor(oldMood),
        toColor: getMoodColor(newMood),
      });
    }
  }

  return commands;
}

export interface UseUserOrderingOptions {
  /** Maximum number of slots (default: 48) */
  maxSlots?: number;
  /** Color transition duration in seconds (default: 0.5) */
  colorTransitionDuration?: number;
  /** Enter/exit animation duration in seconds (default: 0.3) */
  scaleTransitionDuration?: number;
}

export interface SlotColorState {
  /** Current interpolated color */
  currentColor: THREE.Color;
  /** Target color (lerping towards) */
  targetColor: THREE.Color;
  /** Lerp progress (0 = at current, 1 = at target) */
  lerpProgress: number;
  /** Whether slot is active (has user) */
  isActive: boolean;
  /** Scale animation progress (0 = hidden, 1 = full size) */
  activeProgress: number;
  /** Target active state */
  targetActive: boolean;
  /** Mood index (-1 for empty) */
  moodIndex: number;
}

export interface UseUserOrderingReturn {
  /** Current slot color states */
  slotStates: SlotColorState[];
  /** Update mood array (call when presence data changes) */
  updateMoodArray: (newArray: number[]) => void;
  /** Update animation state (call each frame) */
  tick: (delta: number) => void;
  /** Get current mood array */
  getMoodArray: () => number[];
}

/**
 * Hook for managing user ordering with smooth color/scale transitions
 *
 * Usage:
 * ```tsx
 * const { slotStates, updateMoodArray, tick } = useUserOrdering({ maxSlots: 48 });
 *
 * // When presence changes
 * useEffect(() => {
 *   const moodArray = presenceToMoodArray(users, 48);
 *   updateMoodArray(moodArray);
 * }, [users]);
 *
 * // In animation loop
 * useFrame((_, delta) => {
 *   tick(delta);
 *   // Apply slotStates[i].currentColor to shards
 * });
 * ```
 */
export function useUserOrdering(options: UseUserOrderingOptions = {}): UseUserOrderingReturn {
  const { maxSlots = 48, colorTransitionDuration = 0.5, scaleTransitionDuration = 0.3 } = options;

  const moodArrayRef = useRef<number[]>(new Array(maxSlots).fill(EMPTY_SLOT));

  // Initialize slot states (using useMemo for stable initialization)
  const initialSlotStates = useMemo(() => {
    const states: SlotColorState[] = [];
    for (let i = 0; i < maxSlots; i++) {
      const fallbackColor = getSlotFallbackColor(i);
      states.push({
        currentColor: fallbackColor.clone(),
        targetColor: fallbackColor.clone(),
        lerpProgress: 1,
        isActive: false,
        activeProgress: 0,
        targetActive: false,
        moodIndex: EMPTY_SLOT,
      });
    }
    return states;
  }, [maxSlots]);

  const slotStatesRef = useRef<SlotColorState[]>(initialSlotStates);

  const updateMoodArray = useCallback((newArray: number[]) => {
    const oldArray = moodArrayRef.current;
    const commands = diffMoodArrays(oldArray, newArray);
    const states = slotStatesRef.current as SlotColorState[];

    for (const cmd of commands) {
      const state = states[cmd.slotIndex];
      if (!state) continue;

      switch (cmd.type) {
        case 'enter':
          // Start enter animation
          state.targetColor.copy(getMoodColor(cmd.moodIndex));
          state.targetActive = true;
          state.moodIndex = cmd.moodIndex;
          // If not currently active, start from current (maintains color continuity)
          if (!state.isActive) {
            state.currentColor.copy(state.targetColor);
            state.lerpProgress = 1;
          } else {
            // Color change during enter - restart lerp
            state.lerpProgress = 0;
          }
          break;

        case 'exit':
          // Start exit animation
          state.targetActive = false;
          state.moodIndex = EMPTY_SLOT;
          // Keep current color during fade out
          break;

        case 'color_change':
          // Lerp to new color
          state.targetColor.copy(cmd.toColor);
          state.lerpProgress = 0;
          state.moodIndex = newArray[cmd.slotIndex];
          break;
      }
    }

    moodArrayRef.current = [...newArray];
  }, []);

  const tick = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Animation state machine with color lerping + active state transitions requires branching logic
    (delta: number) => {
      const states = slotStatesRef.current;
      const colorSpeed = 1 / colorTransitionDuration;
      const scaleSpeed = 1 / scaleTransitionDuration;

      for (const state of states) {
        // Update color lerp
        if (state.lerpProgress < 1) {
          state.lerpProgress = Math.min(1, state.lerpProgress + delta * colorSpeed);
          // Use easeOutQuad for smooth deceleration
          const t = 1 - (1 - state.lerpProgress) * (1 - state.lerpProgress);
          state.currentColor.lerpColors(
            state.currentColor,
            state.targetColor,
            t > 0.99 ? 1 : t * delta * colorSpeed * 2,
          );
        }

        // Update active state (scale animation)
        if (state.targetActive && state.activeProgress < 1) {
          state.activeProgress = Math.min(1, state.activeProgress + delta * scaleSpeed);
          if (state.activeProgress >= 1) {
            state.isActive = true;
          }
        } else if (!state.targetActive && state.activeProgress > 0) {
          state.activeProgress = Math.max(0, state.activeProgress - delta * scaleSpeed);
          if (state.activeProgress <= 0) {
            state.isActive = false;
          }
        }
      }
    },
    [colorTransitionDuration, scaleTransitionDuration],
  );

  const getMoodArray = useCallback(() => moodArrayRef.current, []);

  return {
    slotStates: slotStatesRef.current,
    updateMoodArray,
    tick,
    getMoodArray,
  };
}
