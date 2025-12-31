/**
 * SlotManager - Slot-based user ordering system for particle swarm
 *
 * Implements stable visual positioning using slot assignment:
 * - Users are assigned to slots in arrival order
 * - Slots maintain stable positions (no jarring shifts when users join/leave)
 * - First-available-slot assignment minimizes visual disruption
 * - Diff-based reconciliation for minimal changes during updates
 *
 * Game dev patterns used:
 * - Object Pooling: Pre-allocated slots, reused across user changes
 * - State Machine: Slot lifecycle (EMPTY → ENTERING → ACTIVE → EXITING → EMPTY)
 * - Command Buffer: Pending changes applied during hold phase only
 * - Diff Reconciliation: Minimal changes by comparing current vs new state
 */

import type { MoodId } from '../../constants';

/**
 * Slot lifecycle states
 *
 * State transitions:
 * - EMPTY → ENTERING (user assigned)
 * - ENTERING → ACTIVE (animation complete)
 * - ACTIVE → EXITING (user leaves)
 * - EXITING → EMPTY (animation complete)
 */
export enum SlotState {
  EMPTY = 'empty',
  ENTERING = 'entering',
  ACTIVE = 'active',
  EXITING = 'exiting',
}

/**
 * Individual user in the breathing session
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User's current mood */
  mood: MoodId;
  /** Timestamp when user joined (for ordering) */
  joinedAt: number;
}

/**
 * Slot data - position in the particle swarm
 */
export interface Slot {
  /** Slot index (maps to Fibonacci sphere position) */
  index: number;
  /** Current lifecycle state */
  state: SlotState;
  /** Assigned user (null if empty or exiting without user) */
  userId: string | null;
  /** User's mood (cached for rendering during exit animation) */
  mood: MoodId | null;
  /** Animation progress (0-1) for enter/exit animations */
  animationProgress: number;
  /** Timestamp when current animation started */
  animationStartTime: number;
}

/**
 * Reconciliation result - changes to apply
 */
export interface ReconciliationResult {
  /** Slots where users are entering */
  entering: Slot[];
  /** Slots where users are exiting */
  exiting: Slot[];
  /** Slots that remain unchanged */
  unchanged: Slot[];
  /** Total active/entering/exiting slots (visible count) */
  visibleCount: number;
}

/**
 * Animation durations in seconds
 */
const ENTER_DURATION = 0.5; // Scale 0 → 1
const EXIT_DURATION = 0.4; // Scale 1 → 0 (slightly faster for snappy feel)

/**
 * SlotManager - Manages slot assignment and lifecycle for particle swarm
 *
 * Usage:
 * ```ts
 * const manager = new SlotManager();
 * manager.reconcile(newUsers); // Returns changes to apply
 * manager.updateAnimations(delta); // Call each frame
 * ```
 */
export class SlotManager {
  private slots: Slot[] = [];
  private userToSlot: Map<string, number> = new Map();
  private pendingUsers: User[] | null = null;
  private lastReconcileCycle: number = -1;

  /**
   * Initialize slots
   * Should be called when particle count changes
   */
  initialize(slotCount: number): void {
    // Preserve existing slot states where possible
    const oldSlots = this.slots;
    this.slots = [];

    for (let i = 0; i < slotCount; i++) {
      const existing = oldSlots[i];
      if (existing && existing.state !== SlotState.EMPTY) {
        // Keep existing non-empty slot
        this.slots.push(existing);
      } else {
        // Create empty slot
        this.slots.push({
          index: i,
          state: SlotState.EMPTY,
          userId: null,
          mood: null,
          animationProgress: 0,
          animationStartTime: 0,
        });
      }
    }

    // Rebuild user-to-slot mapping
    this.userToSlot.clear();
    for (const slot of this.slots) {
      if (slot.userId) {
        this.userToSlot.set(slot.userId, slot.index);
      }
    }
  }

  /**
   * Get current slot count
   */
  getSlotCount(): number {
    return this.slots.length;
  }

  /**
   * Get all slots (for rendering)
   */
  getSlots(): readonly Slot[] {
    return this.slots;
  }

  /**
   * Queue users for reconciliation during next hold phase
   *
   * The mood array can update multiple times per cycle, but we only
   * apply changes once per breathing cycle during hold phase.
   */
  queueUpdate(users: User[]): void {
    this.pendingUsers = users;
  }

  /**
   * Check if we should reconcile based on breathing cycle
   *
   * @param phaseType Current phase (0=inhale, 1=hold-in, 2=exhale, 3=hold-out)
   * @param cycleNumber Current breathing cycle number (derived from elapsed time)
   * @returns true if reconciliation should happen now
   */
  shouldReconcile(phaseType: number, cycleNumber: number): boolean {
    // Only reconcile during hold phases (1 = hold-in, 3 = hold-out)
    const isHoldPhase = phaseType === 1 || phaseType === 3;

    // Only reconcile once per cycle
    const isNewCycle = cycleNumber !== this.lastReconcileCycle;

    return isHoldPhase && isNewCycle && this.pendingUsers !== null;
  }

  /**
   * Perform diff-based reconciliation
   *
   * Compares current user set with new user set and:
   * - Keeps existing users in their slots (stability)
   * - Assigns new users to first available empty slots
   * - Marks departed users' slots for exit animation
   *
   * @param users New user list (or null to use queued users)
   * @param cycleNumber Current breathing cycle for gating
   * @returns Changes to apply (entering/exiting/unchanged)
   */
  reconcile(users?: User[], cycleNumber?: number): ReconciliationResult {
    const targetUsers = users ?? this.pendingUsers ?? [];
    const currentTime = performance.now() / 1000;

    // Update cycle tracking
    if (cycleNumber !== undefined) {
      this.lastReconcileCycle = cycleNumber;
    }
    this.pendingUsers = null;

    // Build set of current user IDs
    const newUserIds = new Set(targetUsers.map((u) => u.id));
    const newUsersMap = new Map(targetUsers.map((u) => [u.id, u]));

    const result: ReconciliationResult = {
      entering: [],
      exiting: [],
      unchanged: [],
      visibleCount: 0,
    };

    // Phase 1: Mark departing users for exit
    for (const slot of this.slots) {
      if (slot.userId && !newUserIds.has(slot.userId)) {
        // User has left - start exit animation
        if (slot.state === SlotState.ACTIVE || slot.state === SlotState.ENTERING) {
          slot.state = SlotState.EXITING;
          slot.animationProgress = 0;
          slot.animationStartTime = currentTime;
          // Keep userId and mood for exit animation
          result.exiting.push(slot);
        }
      }
    }

    // Phase 2: Update existing users (mood changes)
    for (const slot of this.slots) {
      if (slot.userId && newUserIds.has(slot.userId)) {
        const user = newUsersMap.get(slot.userId);
        if (user && slot.state !== SlotState.EXITING) {
          // Update mood if changed
          slot.mood = user.mood;
          result.unchanged.push(slot);
        }
      }
    }

    // Phase 3: Assign new users to empty slots
    const usersNeedingSlots = targetUsers.filter((u) => !this.userToSlot.has(u.id));

    // Sort by join time to maintain arrival order
    usersNeedingSlots.sort((a, b) => a.joinedAt - b.joinedAt);

    for (const user of usersNeedingSlots) {
      const emptySlot = this.findFirstEmptySlot();
      if (emptySlot) {
        emptySlot.state = SlotState.ENTERING;
        emptySlot.userId = user.id;
        emptySlot.mood = user.mood;
        emptySlot.animationProgress = 0;
        emptySlot.animationStartTime = currentTime;
        this.userToSlot.set(user.id, emptySlot.index);
        result.entering.push(emptySlot);
      }
      // If no empty slot available, user waits (will be assigned when slot frees up)
    }

    // Calculate visible count
    result.visibleCount = this.slots.filter((s) => s.state !== SlotState.EMPTY).length;

    return result;
  }

  /**
   * Update animation progress for all slots
   * Call this every frame in useFrame()
   *
   * @param delta Time since last frame in seconds
   * @returns true if any animations completed this frame
   */
  updateAnimations(delta: number): boolean {
    let anyCompleted = false;
    const currentTime = performance.now() / 1000;

    for (const slot of this.slots) {
      if (slot.state === SlotState.ENTERING) {
        const elapsed = currentTime - slot.animationStartTime;
        slot.animationProgress = Math.min(1, elapsed / ENTER_DURATION);

        if (slot.animationProgress >= 1) {
          slot.state = SlotState.ACTIVE;
          anyCompleted = true;
        }
      } else if (slot.state === SlotState.EXITING) {
        const elapsed = currentTime - slot.animationStartTime;
        slot.animationProgress = Math.min(1, elapsed / EXIT_DURATION);

        if (slot.animationProgress >= 1) {
          // Clean up slot
          if (slot.userId) {
            this.userToSlot.delete(slot.userId);
          }
          slot.state = SlotState.EMPTY;
          slot.userId = null;
          slot.mood = null;
          slot.animationProgress = 0;
          anyCompleted = true;
        }
      }
    }

    return anyCompleted;
  }

  /**
   * Get scale multiplier for a slot based on animation state
   *
   * @param slotIndex Slot index
   * @returns Scale 0-1 (0 = invisible, 1 = full size)
   */
  getSlotScale(slotIndex: number): number {
    const slot = this.slots[slotIndex];
    if (!slot) return 0;

    switch (slot.state) {
      case SlotState.EMPTY:
        return 0;

      case SlotState.ENTERING:
        // Ease out cubic for snappy enter
        return easeOutCubic(slot.animationProgress);

      case SlotState.ACTIVE:
        return 1;

      case SlotState.EXITING:
        // Ease in cubic for smooth exit
        return 1 - easeInCubic(slot.animationProgress);

      default:
        return 0;
    }
  }

  /**
   * Get mood for a slot (for coloring)
   */
  getSlotMood(slotIndex: number): MoodId | null {
    return this.slots[slotIndex]?.mood ?? null;
  }

  /**
   * Check if a slot is visible (has a user in any animation state)
   */
  isSlotVisible(slotIndex: number): boolean {
    const slot = this.slots[slotIndex];
    return slot !== undefined && slot.state !== SlotState.EMPTY;
  }

  /**
   * Find first empty slot (for assigning new users)
   */
  private findFirstEmptySlot(): Slot | null {
    for (const slot of this.slots) {
      if (slot.state === SlotState.EMPTY) {
        return slot;
      }
    }
    return null;
  }

  /**
   * Get ordered list of visible slot indices
   * Used for dynamic Fibonacci position calculation
   *
   * @returns Array of slot indices that are visible (not EMPTY), in slot order
   */
  getVisibleSlotIndices(): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].state !== SlotState.EMPTY) {
        indices.push(i);
      }
    }
    return indices;
  }

  /**
   * Get the count of visible slots (ENTERING, ACTIVE, or EXITING)
   */
  getVisibleCount(): number {
    let count = 0;
    for (const slot of this.slots) {
      if (slot.state !== SlotState.EMPTY) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get statistics for debugging
   */
  getStats(): {
    total: number;
    empty: number;
    entering: number;
    active: number;
    exiting: number;
  } {
    const stats = {
      total: this.slots.length,
      empty: 0,
      entering: 0,
      active: 0,
      exiting: 0,
    };

    for (const slot of this.slots) {
      switch (slot.state) {
        case SlotState.EMPTY:
          stats.empty++;
          break;
        case SlotState.ENTERING:
          stats.entering++;
          break;
        case SlotState.ACTIVE:
          stats.active++;
          break;
        case SlotState.EXITING:
          stats.exiting++;
          break;
      }
    }

    return stats;
  }
}

/**
 * Easing functions for animations
 */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInCubic(t: number): number {
  return t * t * t;
}

/**
 * Calculate breathing cycle number from elapsed time
 * Used for once-per-cycle update gating
 */
export function calculateCycleNumber(elapsedTime: number, cycleDuration: number): number {
  return Math.floor(elapsedTime / cycleDuration);
}
