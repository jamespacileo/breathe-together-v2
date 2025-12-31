/**
 * MoodSlots - Slot-based user ordering system
 *
 * Manages a fixed-size array of mood slots where each slot represents one user.
 * Preserves arrival order and enables smooth transitions when users join/leave.
 *
 * **Design Principles:**
 * - Simple data structure: `(MoodId | null)[]` where null = empty slot
 * - First-available slot assignment preserves visual stability
 * - Diff-based updates enable smooth enter/exit animations
 * - Fixed slot count prevents jarring particle count changes
 */

import { MOOD_IDS, type MoodId } from '../constants';

/**
 * A slot is either occupied (MoodId) or empty (null)
 */
export type MoodSlot = MoodId | null;

/**
 * Array of mood slots - index = slot position, value = mood or null
 */
export type MoodSlots = MoodSlot[];

/**
 * Transition types for animation system
 */
export type SlotTransition =
  | { type: 'enter'; slotIndex: number; mood: MoodId }
  | { type: 'exit'; slotIndex: number; previousMood: MoodId }
  | { type: 'change'; slotIndex: number; from: MoodId; to: MoodId };

/**
 * Result of diffing two slot arrays
 */
export interface SlotsDiff {
  /** Slots where users joined (null → mood) */
  enters: Array<{ slotIndex: number; mood: MoodId }>;
  /** Slots where users left (mood → null) */
  exits: Array<{ slotIndex: number; previousMood: MoodId }>;
  /** Slots where mood changed (mood → different mood) */
  changes: Array<{ slotIndex: number; from: MoodId; to: MoodId }>;
  /** True if any changes occurred */
  hasChanges: boolean;
}

/**
 * Create an empty slots array of given size
 */
export function createEmptySlots(size: number): MoodSlots {
  return new Array(size).fill(null);
}

/**
 * Find the first available (empty) slot index
 * @returns slot index or -1 if full
 */
export function findFirstEmptySlot(slots: MoodSlots): number {
  return slots.indexOf(null);
}

/**
 * Count occupied slots
 */
export function countOccupied(slots: MoodSlots): number {
  return slots.filter((slot) => slot !== null).length;
}

/**
 * Get mood counts from slots (for backwards compatibility)
 */
export function getMoodCounts(slots: MoodSlots): Partial<Record<MoodId, number>> {
  const counts: Partial<Record<MoodId, number>> = {};
  for (const slot of slots) {
    if (slot !== null) {
      counts[slot] = (counts[slot] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Diff two slot arrays to find transitions
 *
 * O(n) time where n is slot count. Called on presence updates (~1-5/min).
 *
 * @param oldSlots - Previous slot state
 * @param newSlots - New slot state
 * @returns Diff result with enters, exits, and changes
 */
export function diffSlots(oldSlots: MoodSlots, newSlots: MoodSlots): SlotsDiff {
  const enters: SlotsDiff['enters'] = [];
  const exits: SlotsDiff['exits'] = [];
  const changes: SlotsDiff['changes'] = [];

  const maxLen = Math.max(oldSlots.length, newSlots.length);

  for (let i = 0; i < maxLen; i++) {
    const oldSlot = oldSlots[i] ?? null;
    const newSlot = newSlots[i] ?? null;

    if (oldSlot === null && newSlot !== null) {
      // User joined this slot
      enters.push({ slotIndex: i, mood: newSlot });
    } else if (oldSlot !== null && newSlot === null) {
      // User left this slot
      exits.push({ slotIndex: i, previousMood: oldSlot });
    } else if (oldSlot !== null && newSlot !== null && oldSlot !== newSlot) {
      // Mood changed in this slot
      changes.push({ slotIndex: i, from: oldSlot, to: newSlot });
    }
  }

  return {
    enters,
    exits,
    changes,
    hasChanges: enters.length > 0 || exits.length > 0 || changes.length > 0,
  };
}

/**
 * Convert mood counts to slot array (for initial setup or legacy compatibility)
 *
 * Assigns moods to slots in order, filling from slot 0.
 * Used when converting from the old `{ mood: count }` format.
 *
 * @param moodCounts - Mood counts object (e.g., { calm: 3, anxious: 2 })
 * @param slotCount - Total number of slots
 * @returns Slot array with moods assigned
 */
export function moodCountsToSlots(
  moodCounts: Partial<Record<MoodId, number>>,
  slotCount: number,
): MoodSlots {
  const slots = createEmptySlots(slotCount);
  let currentSlot = 0;

  // Assign moods to slots in consistent order (alphabetical mood order)
  const sortedMoods = Object.entries(moodCounts).sort(([a], [b]) => a.localeCompare(b));

  for (const [mood, count] of sortedMoods) {
    for (let i = 0; i < (count ?? 0) && currentSlot < slotCount; i++) {
      slots[currentSlot] = mood as MoodId;
      currentSlot++;
    }
  }

  return slots;
}

/**
 * Add a user to the first available slot
 *
 * @param slots - Current slot state
 * @param mood - Mood of the new user
 * @returns Updated slots array (new reference) or null if full
 */
export function addUserToSlots(slots: MoodSlots, mood: MoodId): MoodSlots | null {
  const emptyIndex = findFirstEmptySlot(slots);
  if (emptyIndex === -1) return null;

  const newSlots = [...slots];
  newSlots[emptyIndex] = mood;
  return newSlots;
}

/**
 * Remove a user from a specific slot
 *
 * @param slots - Current slot state
 * @param slotIndex - Slot to clear
 * @returns Updated slots array (new reference)
 */
export function removeUserFromSlot(slots: MoodSlots, slotIndex: number): MoodSlots {
  if (slotIndex < 0 || slotIndex >= slots.length) return slots;

  const newSlots = [...slots];
  newSlots[slotIndex] = null;
  return newSlots;
}

/**
 * Remove first user with specified mood
 *
 * @param slots - Current slot state
 * @param mood - Mood to remove
 * @returns Updated slots array (new reference)
 */
export function removeUserByMood(slots: MoodSlots, mood: MoodId): MoodSlots {
  const index = slots.indexOf(mood);
  if (index === -1) return slots;

  const newSlots = [...slots];
  newSlots[index] = null;
  return newSlots;
}

/**
 * Apply a diff to update mood counts to new target
 *
 * Handles the case where we have old mood counts and new mood counts,
 * and need to intelligently assign/remove users to minimize visual disruption.
 *
 * Strategy:
 * 1. First, remove users who left (moods with decreased counts)
 * 2. Then, add users who joined (moods with increased counts)
 *
 * @param currentSlots - Current slot state
 * @param newMoodCounts - Target mood counts
 * @returns Updated slots with minimal slot reassignment
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Reconciliation logic requires iterating through all moods with add/remove deltas
export function reconcileSlotsWithCounts(
  currentSlots: MoodSlots,
  newMoodCounts: Partial<Record<MoodId, number>>,
): MoodSlots {
  const currentCounts = getMoodCounts(currentSlots);
  const slots = [...currentSlots];

  // Calculate deltas for each mood
  const allMoodsSet = new Set([...Object.keys(currentCounts), ...Object.keys(newMoodCounts)]);
  const allMoods = Array.from(allMoodsSet) as MoodId[];

  for (const mood of allMoods) {
    const currentCount = currentCounts[mood] ?? 0;
    const targetCount = newMoodCounts[mood] ?? 0;
    const delta = targetCount - currentCount;

    if (delta < 0) {
      // Remove |delta| users of this mood (from end to preserve arrival order)
      let toRemove = Math.abs(delta);
      for (let i = slots.length - 1; i >= 0 && toRemove > 0; i--) {
        if (slots[i] === mood) {
          slots[i] = null;
          toRemove--;
        }
      }
    } else if (delta > 0) {
      // Add delta users of this mood to first available slots
      let toAdd = delta;
      for (let i = 0; i < slots.length && toAdd > 0; i++) {
        if (slots[i] === null) {
          slots[i] = mood;
          toAdd--;
        }
      }
    }
  }

  return slots;
}

/**
 * Generate a randomized array of moods for initial display
 *
 * Creates a slot array with randomly assigned moods, simulating
 * users who arrived in random order. This format matches the
 * future backend data structure (array of mood IDs).
 *
 * @param slotCount - Total number of slots
 * @param fillRatio - Percentage of slots to fill (0-1), default 0.6 (60%)
 * @returns Slot array with randomly assigned moods
 */
export function generateRandomMoodSlots(slotCount: number, fillRatio = 0.6): MoodSlots {
  const slots = createEmptySlots(slotCount);
  const targetFill = Math.floor(slotCount * Math.min(1, Math.max(0, fillRatio)));

  // Randomly select which slots to fill
  const slotIndices = Array.from({ length: slotCount }, (_, i) => i);

  // Fisher-Yates shuffle for unbiased random selection
  for (let i = slotIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slotIndices[i], slotIndices[j]] = [slotIndices[j], slotIndices[i]];
  }

  // Fill the first targetFill slots with random moods
  for (let i = 0; i < targetFill; i++) {
    const slotIndex = slotIndices[i];
    const randomMood = MOOD_IDS[Math.floor(Math.random() * MOOD_IDS.length)];
    slots[slotIndex] = randomMood;
  }

  return slots;
}
