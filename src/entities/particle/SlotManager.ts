/**
 * SlotManager - Object Pool Pattern for stable user slot assignment
 *
 * Game Dev Pattern: Object Pool + State Machine + Diff Reconciliation
 *
 * Key design goals:
 * 1. Visual stability: Users maintain their position (no jarring color shifts)
 * 2. Smooth transitions: Scale animations for enter/exit
 * 3. Arrival order: First available slot assigned to new users
 * 4. Minimal disruption: Diff-based reconciliation
 * 5. Cycle-aware updates: Only reconcile during hold phase, once per cycle
 *
 * Architecture:
 * - Slots are pre-allocated and reused (Object Pool)
 * - Each slot has a state machine: empty → entering → active → exiting → empty
 * - Users are matched by ID, not position
 * - Fibonacci sphere positions are stable per slot index
 */

import type { MoodId } from '../../constants';

/**
 * Individual user with stable identity
 * Unlike aggregate mood counts, this allows tracking specific users
 */
export interface User {
  /** Unique identifier for this user (stable across sessions) */
  id: string;
  /** Current mood selection */
  mood: MoodId;
}

/**
 * Slot lifecycle state machine
 *
 * Transitions:
 * - empty → entering: User assigned to slot
 * - entering → active: Scale animation reaches 1.0
 * - active → exiting: User removed from slot
 * - exiting → empty: Scale animation reaches 0.0
 *
 * Invalid transitions (guarded against):
 * - entering → exiting: Must complete enter first
 * - active → entering: Already active
 */
export type SlotState = 'empty' | 'entering' | 'active' | 'exiting';

/**
 * Internal slot structure managed by SlotManager
 * Contains both logical state and animation state
 */
export interface Slot {
  /** Slot index (maps to Fibonacci sphere position) */
  index: number;
  /** Current lifecycle state */
  state: SlotState;
  /** Assigned user ID (null when empty/exiting) */
  userId: string | null;
  /** Current mood for color (preserved during exit animation) */
  mood: MoodId | null;
  /** Current visual scale 0-1 (animated) */
  scale: number;
  /** Target scale for animation (0 or 1) */
  targetScale: number;
  /** Timestamp when state changed (for animation timing) */
  stateChangedAt: number;
}

/**
 * Result of a reconciliation pass
 * Used for debugging and metrics
 */
export interface ReconciliationResult {
  /** Number of new users assigned to slots */
  added: number;
  /** Number of users removed from slots */
  removed: number;
  /** Number of users whose mood changed */
  moodChanged: number;
  /** Whether any changes were made */
  hasChanges: boolean;
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  /** Duration of enter animation in seconds */
  enterDuration: number;
  /** Duration of exit animation in seconds */
  exitDuration: number;
  /** Easing function for enter (0-1 normalized time) */
  enterEasing: (t: number) => number;
  /** Easing function for exit (0-1 normalized time) */
  exitEasing: (t: number) => number;
}

/**
 * Default animation configuration
 * - Enter: Quick bounce-in (0.4s)
 * - Exit: Smooth fade-out (0.3s)
 */
const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  enterDuration: 0.4,
  exitDuration: 0.3,
  // Ease out cubic for snappy enter
  enterEasing: (t: number) => 1 - (1 - t) ** 3,
  // Ease in quad for smooth exit
  exitEasing: (t: number) => 1 - t * t,
};

/**
 * SlotManager - Manages a pool of slots for user visualization
 *
 * Usage:
 * ```ts
 * const manager = new SlotManager();
 *
 * // Each frame, check if we should update (during hold phase)
 * if (shouldUpdate) {
 *   manager.reconcile(currentUsers);
 * }
 *
 * // Update animations every frame
 * manager.updateAnimations(deltaTime);
 *
 * // Read slot state for rendering
 * for (const slot of manager.slots) {
 *   if (slot.state !== 'empty') {
 *     renderShard(slot.index, slot.mood, slot.scale);
 *   }
 * }
 * ```
 */
export class SlotManager {
  /** Pool of all slots (grows dynamically as needed) */
  private _slots: Slot[] = [];

  /** Quick lookup: userId → slot index */
  private userToSlot: Map<string, number> = new Map();

  /** Animation configuration */
  private animConfig: AnimationConfig;

  /** Current time (updated via updateAnimations) */
  private currentTime = 0;

  /** Last breathing cycle index when reconciliation occurred */
  private lastReconcileCycle = -1;

  constructor(config: Partial<AnimationConfig> = {}) {
    this.animConfig = { ...DEFAULT_ANIMATION_CONFIG, ...config };
  }

  /**
   * Read-only access to all slots
   * Use for rendering - iterate and check state/scale
   */
  get slots(): readonly Slot[] {
    return this._slots;
  }

  /**
   * Number of active or transitioning slots (not empty)
   */
  get activeCount(): number {
    return this._slots.filter((s) => s.state !== 'empty').length;
  }

  /**
   * Number of fully active slots (not transitioning)
   */
  get fullyActiveCount(): number {
    return this._slots.filter((s) => s.state === 'active').length;
  }

  /**
   * Check if we should reconcile this cycle
   *
   * @param cycleIndex - Current breathing cycle index (derived from UTC time)
   * @returns true if we haven't reconciled this cycle yet
   */
  shouldReconcile(cycleIndex: number): boolean {
    return cycleIndex !== this.lastReconcileCycle;
  }

  /**
   * Mark that we've reconciled this cycle
   *
   * @param cycleIndex - Current breathing cycle index
   */
  markReconciled(cycleIndex: number): void {
    this.lastReconcileCycle = cycleIndex;
  }

  /**
   * Diff-based reconciliation: Update slots to match new user list
   *
   * Strategy:
   * 1. Build set of current user IDs
   * 2. Mark slots for removal (user no longer in list)
   * 3. Handle mood changes for existing users
   * 4. Assign new users to first available slots
   * 5. Expand pool if needed
   *
   * @param users - Current list of users
   * @returns Reconciliation statistics
   */
  reconcile(users: User[]): ReconciliationResult {
    const result: ReconciliationResult = {
      added: 0,
      removed: 0,
      moodChanged: 0,
      hasChanges: false,
    };

    // Build lookup of incoming users
    const incomingUsers = new Map<string, User>();
    for (const user of users) {
      incomingUsers.set(user.id, user);
    }

    // Phase 1: Mark removals and handle mood changes
    for (const slot of this._slots) {
      if (slot.userId === null) continue;

      const incomingUser = incomingUsers.get(slot.userId);

      if (!incomingUser) {
        // User left - start exit animation
        this.startExit(slot);
        result.removed++;
        result.hasChanges = true;
      } else if (slot.mood !== incomingUser.mood) {
        // Mood changed - update color (instant, no animation)
        slot.mood = incomingUser.mood;
        result.moodChanged++;
        result.hasChanges = true;
      }

      // Remove from incoming set (already handled)
      incomingUsers.delete(slot.userId);
    }

    // Phase 2: Assign new users to available slots
    incomingUsers.forEach((user, userId) => {
      const slotIndex = this.findOrCreateEmptySlot();
      this.assignUserToSlot(slotIndex, userId, user.mood);
      result.added++;
      result.hasChanges = true;
    });

    return result;
  }

  /**
   * Update all animation states
   * Call this every frame with delta time
   *
   * @param deltaTime - Time since last frame in seconds
   */
  updateAnimations(deltaTime: number): void {
    this.currentTime += deltaTime;

    for (const slot of this._slots) {
      if (slot.state === 'entering') {
        this.updateEnterAnimation(slot);
      } else if (slot.state === 'exiting') {
        this.updateExitAnimation(slot);
      }
      // 'active' and 'empty' states have static scale
    }
  }

  /**
   * Force immediate update of a slot's scale
   * Useful for initialization or testing
   */
  setSlotScale(index: number, scale: number): void {
    if (index >= 0 && index < this._slots.length) {
      this._slots[index].scale = scale;
    }
  }

  /**
   * Get slot by user ID
   * @returns Slot or undefined if user not found
   */
  getSlotByUserId(userId: string): Slot | undefined {
    const slotIndex = this.userToSlot.get(userId);
    if (slotIndex === undefined) return undefined;
    return this._slots[slotIndex];
  }

  /**
   * Clear all slots and reset state
   * Useful for cleanup or testing
   */
  reset(): void {
    this._slots = [];
    this.userToSlot.clear();
    this.lastReconcileCycle = -1;
    this.currentTime = 0;
  }

  // ============================================================
  // Private Methods
  // ============================================================

  /**
   * Find first empty slot or create new one
   * Maintains arrival order by always using lowest available index
   */
  private findOrCreateEmptySlot(): number {
    // First, look for an empty slot
    for (let i = 0; i < this._slots.length; i++) {
      if (this._slots[i].state === 'empty') {
        return i;
      }
    }

    // No empty slots - expand pool
    const newIndex = this._slots.length;
    this._slots.push(this.createEmptySlot(newIndex));
    return newIndex;
  }

  /**
   * Create a new empty slot at given index
   */
  private createEmptySlot(index: number): Slot {
    return {
      index,
      state: 'empty',
      userId: null,
      mood: null,
      scale: 0,
      targetScale: 0,
      stateChangedAt: this.currentTime,
    };
  }

  /**
   * Assign a user to a slot and start enter animation
   */
  private assignUserToSlot(slotIndex: number, userId: string, mood: MoodId): void {
    const slot = this._slots[slotIndex];

    slot.state = 'entering';
    slot.userId = userId;
    slot.mood = mood;
    slot.scale = 0;
    slot.targetScale = 1;
    slot.stateChangedAt = this.currentTime;

    this.userToSlot.set(userId, slotIndex);
  }

  /**
   * Start exit animation for a slot
   */
  private startExit(slot: Slot): void {
    // Guard: Don't interrupt enter animation
    // (rare edge case if user leaves immediately after joining)
    if (slot.state === 'entering') {
      // Fast-forward to active first, then exit
      slot.scale = 1;
      slot.state = 'active';
    }

    // Remove from lookup immediately (user is "gone")
    if (slot.userId) {
      this.userToSlot.delete(slot.userId);
    }

    slot.state = 'exiting';
    slot.targetScale = 0;
    slot.stateChangedAt = this.currentTime;
    // Keep userId/mood during exit for visual continuity
    // They'll be cleared when animation completes
  }

  /**
   * Update enter animation for a slot
   */
  private updateEnterAnimation(slot: Slot): void {
    const elapsed = this.currentTime - slot.stateChangedAt;
    const progress = Math.min(elapsed / this.animConfig.enterDuration, 1);
    const easedProgress = this.animConfig.enterEasing(progress);

    slot.scale = easedProgress;

    // Transition to active when animation completes
    if (progress >= 1) {
      slot.state = 'active';
      slot.scale = 1;
    }
  }

  /**
   * Update exit animation for a slot
   */
  private updateExitAnimation(slot: Slot): void {
    const elapsed = this.currentTime - slot.stateChangedAt;
    const progress = Math.min(elapsed / this.animConfig.exitDuration, 1);
    const easedProgress = this.animConfig.exitEasing(progress);

    // Exit easing returns remaining scale (starts at 1, ends at 0)
    slot.scale = easedProgress;

    // Transition to empty when animation completes
    if (progress >= 1) {
      slot.state = 'empty';
      slot.scale = 0;
      slot.userId = null;
      slot.mood = null;
    }
  }
}

/**
 * Calculate breathing cycle index from elapsed time
 * Used to ensure we only reconcile once per cycle
 *
 * @param elapsedSeconds - Elapsed time in seconds (from Date.now() / 1000)
 * @param cycleDuration - Duration of one breathing cycle in seconds
 * @returns Integer cycle index
 */
export function getBreathingCycleIndex(elapsedSeconds: number, cycleDuration: number): number {
  return Math.floor(elapsedSeconds / cycleDuration);
}

/**
 * Determine if current phase is a "hold" phase suitable for reconciliation
 *
 * Hold phases provide visual stability - no breathing motion happening,
 * so adding/removing particles is less jarring.
 *
 * @param phaseType - Current phase type (0=inhale, 1=hold-in, 2=exhale, 3=hold-out)
 * @returns true if we're in a hold phase
 */
export function isHoldPhase(phaseType: number): boolean {
  return phaseType === 1 || phaseType === 3;
}

/**
 * Convert aggregate mood counts to individual users
 * Useful for backward compatibility with existing mock presence system
 *
 * Generates stable user IDs based on mood and index, so the same
 * mood distribution will produce the same user IDs.
 *
 * @param moods - Aggregate mood counts { gratitude: 5, presence: 10, ... }
 * @returns Array of individual users with stable IDs
 */
export function moodCountsToUsers(moods: Partial<Record<MoodId, number>>): User[] {
  const users: User[] = [];

  for (const [mood, count] of Object.entries(moods)) {
    if (typeof count !== 'number' || count <= 0) continue;

    for (let i = 0; i < count; i++) {
      users.push({
        // Stable ID: mood-index (e.g., "gratitude-0", "presence-5")
        id: `${mood}-${i}`,
        mood: mood as MoodId,
      });
    }
  }

  return users;
}
