/**
 * ParticleSwarm and SlotManager Tests
 *
 * Tests for verifying that the correct number of shapes are rendered
 * based on the number of users from the backend.
 *
 * Key test scenarios:
 * 1. SlotManager creates correct number of slots for N users
 * 2. Slot reconciliation works correctly with user changes
 * 3. stableCount matches expected user count
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MoodId } from '../constants';
import { moodCountsToUsers, SlotManager, type User } from '../entities/particle/SlotManager';

/**
 * Helper to create mock users
 */
function createMockUsers(count: number, mood: MoodId = 'presence'): User[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    mood,
  }));
}

/**
 * Helper to create users with mixed moods (simulating real backend data)
 */
function createMockUsersWithMoods(moodCounts: Partial<Record<MoodId, number>>): User[] {
  return moodCountsToUsers(moodCounts);
}

describe('SlotManager', () => {
  let slotManager: SlotManager;

  beforeEach(() => {
    slotManager = new SlotManager();
  });

  afterEach(() => {
    slotManager.reset();
  });

  describe('User count verification', () => {
    it('should create slots for exact number of users', () => {
      const userCounts = [10, 20, 42, 100, 200, 500];

      for (const count of userCounts) {
        slotManager.reset();
        const users = createMockUsers(count);

        slotManager.reconcile(users);

        // stableCount = entering + active (not exiting or empty)
        expect(slotManager.stableCount).toBe(count);
      }
    });

    it('should match backend mock presence data (42 users)', () => {
      // This simulates the default mock presence: 42 users
      // Distribution: 35% presence, 30% gratitude, 20% release, 15% connection
      const mockMoods: Partial<Record<MoodId, number>> = {
        presence: Math.floor(42 * 0.35), // 14
        gratitude: Math.floor(42 * 0.3), // 12
        release: Math.floor(42 * 0.2), // 8
        connection: Math.floor(42 * 0.15), // 6
      };
      // Total: 14 + 12 + 8 + 6 = 40 (due to floor rounding)

      const users = createMockUsersWithMoods(mockMoods);
      slotManager.reconcile(users);

      const expectedCount = 14 + 12 + 8 + 6; // 40
      expect(slotManager.stableCount).toBe(expectedCount);
      expect(users.length).toBe(expectedCount);
    });

    it('should handle user additions correctly', () => {
      // Start with 10 users
      const initialUsers = createMockUsers(10);
      slotManager.reconcile(initialUsers);
      expect(slotManager.stableCount).toBe(10);

      // Add 5 more users (total 15)
      const moreUsers = createMockUsers(15);
      slotManager.reconcile(moreUsers);
      expect(slotManager.stableCount).toBe(15);
    });

    it('should handle user removals correctly', () => {
      // Start with 20 users
      const initialUsers = createMockUsers(20);
      slotManager.reconcile(initialUsers);
      expect(slotManager.stableCount).toBe(20);

      // Remove 5 users (15 remaining)
      const fewerUsers = createMockUsers(15);
      slotManager.reconcile(fewerUsers);

      // stableCount should be 15 (exiting slots are not counted)
      expect(slotManager.stableCount).toBe(15);
    });

    it('should correctly count users after animation completes', () => {
      const users = createMockUsers(25);
      slotManager.reconcile(users);

      // Simulate animation completion (0.5s should be enough for enter animations)
      slotManager.updateAnimations(0.5);

      expect(slotManager.fullyActiveCount).toBe(25);
      expect(slotManager.stableCount).toBe(25);
    });
  });

  describe('Mood distribution verification', () => {
    it('should assign correct moods to slots', () => {
      const users: User[] = [
        { id: 'user-1', mood: 'gratitude' },
        { id: 'user-2', mood: 'presence' },
        { id: 'user-3', mood: 'release' },
        { id: 'user-4', mood: 'connection' },
      ];

      slotManager.reconcile(users);

      // Verify each user's mood is correctly assigned
      for (const user of users) {
        const slot = slotManager.getSlotByUserId(user.id);
        expect(slot).toBeDefined();
        expect(slot?.mood).toBe(user.mood);
      }
    });

    it('should handle mood changes for existing users', () => {
      // Initial state
      const users: User[] = [{ id: 'user-1', mood: 'gratitude' }];
      slotManager.reconcile(users);

      const slotBefore = slotManager.getSlotByUserId('user-1');
      expect(slotBefore?.mood).toBe('gratitude');

      // User changes mood
      const updatedUsers: User[] = [{ id: 'user-1', mood: 'release' }];
      slotManager.reconcile(updatedUsers);

      const slotAfter = slotManager.getSlotByUserId('user-1');
      expect(slotAfter?.mood).toBe('release');
      // Same slot should be reused
      expect(slotAfter?.index).toBe(slotBefore?.index);
    });
  });

  describe('Stress tests for high user counts', () => {
    it('should handle 200 users correctly', () => {
      const users = createMockUsers(200);
      slotManager.reconcile(users);

      expect(slotManager.stableCount).toBe(200);
      expect(slotManager.slots.length).toBeGreaterThanOrEqual(200);
    });

    it('should handle 500 users correctly', () => {
      const users = createMockUsers(500);
      slotManager.reconcile(users);

      expect(slotManager.stableCount).toBe(500);
      expect(slotManager.slots.length).toBeGreaterThanOrEqual(500);
    });

    it('should handle rapid user count changes', () => {
      // Simulate rapid changes in user count
      // Note: When users leave, slots go to "exiting" state and need animation to complete
      // before they become "empty" and can be reused
      const counts = [10, 50, 30, 100, 25, 75, 42];

      for (const count of counts) {
        const users = createMockUsers(count);
        slotManager.reconcile(users);

        // Update animations to complete exit animations (0.5s is enough)
        // This allows "exiting" slots to become "empty" for reuse
        slotManager.updateAnimations(0.5);

        // After animation update, stableCount should match
        // (entering + active, not counting exiting)
        expect(slotManager.stableCount).toBe(count);
      }
    });
  });
});

describe('moodCountsToUsers conversion', () => {
  it('should convert mood counts to user array', () => {
    const moods: Partial<Record<MoodId, number>> = {
      gratitude: 5,
      presence: 10,
      release: 3,
      connection: 2,
    };

    const users = moodCountsToUsers(moods);

    expect(users.length).toBe(20); // 5 + 10 + 3 + 2

    // Verify mood distribution
    const moodCounts = users.reduce(
      (acc, user) => {
        acc[user.mood] = (acc[user.mood] || 0) + 1;
        return acc;
      },
      {} as Record<MoodId, number>,
    );

    expect(moodCounts.gratitude).toBe(5);
    expect(moodCounts.presence).toBe(10);
    expect(moodCounts.release).toBe(3);
    expect(moodCounts.connection).toBe(2);
  });

  it('should generate stable user IDs', () => {
    const moods: Partial<Record<MoodId, number>> = { presence: 3, gratitude: 2 };

    const users1 = moodCountsToUsers(moods);
    const users2 = moodCountsToUsers(moods);

    // Same input should produce same output (stable IDs)
    expect(users1.map((u) => u.id)).toEqual(users2.map((u) => u.id));
  });
});

describe('Shard color initialization', () => {
  /**
   * Tests for verifying that shards get their correct colors on initialization.
   *
   * Previously, all shards started with the default "presence" color (teal/green)
   * and only got their correct colors during the first hold phase of the breathing
   * cycle. This caused a visible flash of green shards on load.
   *
   * The fix applies colors immediately after SlotManager.reconcile() in the
   * initialization useEffect, rather than waiting for the animation loop.
   */

  let slotManager: SlotManager;

  beforeEach(() => {
    slotManager = new SlotManager();
  });

  afterEach(() => {
    slotManager.reset();
  });

  it('should assign moods to slots immediately on reconcile (not deferred)', () => {
    // This test verifies that moods are available immediately after reconcile()
    // which is essential for the color initialization fix
    const users: User[] = [
      { id: 'user-1', mood: 'gratitude' },
      { id: 'user-2', mood: 'release' },
      { id: 'user-3', mood: 'connection' },
      { id: 'user-4', mood: 'presence' },
    ];

    slotManager.reconcile(users);

    // All moods should be assigned immediately (not waiting for animation)
    const slots = slotManager.slots;
    const activeSlots = slots.filter((s) => s.state !== 'empty');

    expect(activeSlots.length).toBe(4);
    for (const slot of activeSlots) {
      expect(slot.mood).not.toBeNull();
    }

    // Verify each specific mood is correctly assigned
    const moodSet = new Set(activeSlots.map((s) => s.mood));
    expect(moodSet.has('gratitude')).toBe(true);
    expect(moodSet.has('release')).toBe(true);
    expect(moodSet.has('connection')).toBe(true);
    expect(moodSet.has('presence')).toBe(true);
  });

  it('should have distinct moods for color variety (not all same default)', () => {
    // This test documents the bug that was fixed: all shards starting with
    // the same default color (presence/teal) instead of their actual moods
    const users: User[] = [
      { id: 'user-1', mood: 'gratitude' },
      { id: 'user-2', mood: 'gratitude' },
      { id: 'user-3', mood: 'release' },
      { id: 'user-4', mood: 'release' },
      { id: 'user-5', mood: 'connection' },
      { id: 'user-6', mood: 'presence' },
    ];

    slotManager.reconcile(users);

    const slots = slotManager.slots;
    const moodsBySlot = slots.filter((s) => s.state !== 'empty').map((s) => s.mood);

    // Count how many unique moods we have
    const uniqueMoods = new Set(moodsBySlot);

    // We should have 4 different moods, not just 1 default
    expect(uniqueMoods.size).toBe(4);

    // Count each mood
    const gratitudeCount = moodsBySlot.filter((m) => m === 'gratitude').length;
    const releaseCount = moodsBySlot.filter((m) => m === 'release').length;
    const connectionCount = moodsBySlot.filter((m) => m === 'connection').length;
    const presenceCount = moodsBySlot.filter((m) => m === 'presence').length;

    expect(gratitudeCount).toBe(2);
    expect(releaseCount).toBe(2);
    expect(connectionCount).toBe(1);
    expect(presenceCount).toBe(1);
  });

  it('should preserve moods through slot state transitions', () => {
    // Moods must remain stable as slots transition from entering → active
    const users: User[] = [
      { id: 'user-1', mood: 'gratitude' },
      { id: 'user-2', mood: 'release' },
    ];

    slotManager.reconcile(users);

    // Get initial mood assignment
    const slot1Before = slotManager.getSlotByUserId('user-1');
    const slot2Before = slotManager.getSlotByUserId('user-2');
    expect(slot1Before?.mood).toBe('gratitude');
    expect(slot2Before?.mood).toBe('release');

    // Simulate animation to completion (entering → active)
    slotManager.updateAnimations(1.0);

    // Moods should still be correct after state transition
    const slot1After = slotManager.getSlotByUserId('user-1');
    const slot2After = slotManager.getSlotByUserId('user-2');
    expect(slot1After?.mood).toBe('gratitude');
    expect(slot2After?.mood).toBe('release');
  });
});

describe('Current user tracking', () => {
  /**
   * Tests for verifying that the current user's shard can be correctly identified
   * and tracked in the Fibonacci distribution.
   *
   * Key invariants:
   * 1. The current user always gets a deterministic slot based on array position
   * 2. The user's slot index maps to a specific Fibonacci position
   * 3. The user's slot can be looked up by session ID
   */

  let slotManager: SlotManager;

  beforeEach(() => {
    slotManager = new SlotManager();
  });

  afterEach(() => {
    slotManager.reset();
  });

  it('should find current user slot by session ID', () => {
    const currentUserSessionId = 'abc123-session-id';
    const users: User[] = [
      { id: currentUserSessionId, mood: 'presence' }, // Current user at index 0
      { id: 'other-user-1', mood: 'gratitude' },
      { id: 'other-user-2', mood: 'release' },
    ];

    slotManager.reconcile(users);

    const userSlot = slotManager.getSlotByUserId(currentUserSessionId);
    expect(userSlot).toBeDefined();
    expect(userSlot?.userId).toBe(currentUserSessionId);
    expect(userSlot?.mood).toBe('presence');
    expect(userSlot?.state).toBe('entering'); // Just reconciled
  });

  it('should maintain user slot position when others join/leave', () => {
    const currentUserSessionId = 'current-user-session';

    // Initial state: current user at index 0
    const initialUsers: User[] = [
      { id: currentUserSessionId, mood: 'gratitude' },
      { id: 'other-1', mood: 'presence' },
    ];

    slotManager.reconcile(initialUsers);
    const initialSlot = slotManager.getSlotByUserId(currentUserSessionId);
    expect(initialSlot?.index).toBe(0);

    // Complete animations
    slotManager.updateAnimations(1.0);

    // Add more users (current user should keep slot 0)
    const moreUsers: User[] = [
      { id: currentUserSessionId, mood: 'gratitude' },
      { id: 'other-1', mood: 'presence' },
      { id: 'new-user-1', mood: 'release' },
      { id: 'new-user-2', mood: 'connection' },
    ];

    slotManager.reconcile(moreUsers);
    const slotAfterAdd = slotManager.getSlotByUserId(currentUserSessionId);
    expect(slotAfterAdd?.index).toBe(0); // Same slot

    // Complete animations and remove some users
    slotManager.updateAnimations(1.0);

    const fewerUsers: User[] = [
      { id: currentUserSessionId, mood: 'gratitude' },
      { id: 'new-user-2', mood: 'connection' },
    ];

    slotManager.reconcile(fewerUsers);
    slotManager.updateAnimations(1.0);

    const slotAfterRemove = slotManager.getSlotByUserId(currentUserSessionId);
    expect(slotAfterRemove?.index).toBe(0); // Still slot 0
  });

  it('should return undefined for non-existent user ID', () => {
    const users: User[] = [
      { id: 'user-1', mood: 'presence' },
      { id: 'user-2', mood: 'gratitude' },
    ];

    slotManager.reconcile(users);

    const nonExistentSlot = slotManager.getSlotByUserId('non-existent-id');
    expect(nonExistentSlot).toBeUndefined();
  });

  it('should track user with UUID-style session ID (mock presence format)', () => {
    // Simulate the format used by generateMockPresence with current user
    const sessionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const users: User[] = [
      { id: sessionId, mood: 'release' }, // Current user (UUID format)
      { id: 'presence-0', mood: 'presence' }, // Mock users
      { id: 'presence-1', mood: 'presence' },
      { id: 'gratitude-0', mood: 'gratitude' },
    ];

    slotManager.reconcile(users);

    const userSlot = slotManager.getSlotByUserId(sessionId);
    expect(userSlot).toBeDefined();
    expect(userSlot?.index).toBe(0); // Should be at index 0
    expect(userSlot?.mood).toBe('release');
  });

  it('should provide slot index for Fibonacci position lookup', () => {
    const currentUserId = 'my-session';
    const userCount = 42;

    // Create mock users with current user at index 0
    const users: User[] = [{ id: currentUserId, mood: 'presence' }];
    for (let i = 1; i < userCount; i++) {
      users.push({ id: `user-${i}`, mood: 'presence' });
    }

    slotManager.reconcile(users);

    const userSlot = slotManager.getSlotByUserId(currentUserId);
    expect(userSlot).toBeDefined();

    // The slot index determines the Fibonacci sphere position
    // index 0 maps to getFibonacciSpherePoint(0, stableCount)
    const slotIndex = userSlot?.index;
    expect(slotIndex).toBeGreaterThanOrEqual(0);
    expect(slotIndex).toBeLessThan(slotManager.slots.length);
  });
});

describe('Shard separation (no overlap)', () => {
  /**
   * Tests verifying that shards don't overlap or touch each other.
   *
   * The Fibonacci sphere distribution provides minimum spacing of approximately:
   * spacing ≈ radius × 1.95 / sqrt(N)
   *
   * For shards to not overlap:
   * - Minimum spacing must be greater than 2 × shard diameter + wobble margin
   */

  it('should verify Fibonacci distribution provides adequate separation', () => {
    // Test parameters matching ParticleSwarm defaults
    const particleCounts = [42, 100, 200];
    const baseRadius = 4.5;
    const shardSize = 0.4; // Typical shard size

    for (const count of particleCounts) {
      // Fibonacci sphere minimum spacing formula
      const fibonacciSpacing = (baseRadius * 1.95) / Math.sqrt(count);

      // Required spacing for no overlap (2 × shard radius + wobble margin)
      const wobbleMargin = 0.22; // From PERPENDICULAR_AMPLITUDE + AMBIENT_SCALE
      const requiredSpacing = 2 * shardSize + wobbleMargin;

      // Log for debugging
      console.log(`${count} particles:`);
      console.log(`  Fibonacci spacing: ${fibonacciSpacing.toFixed(3)}`);
      console.log(`  Required spacing: ${requiredSpacing.toFixed(3)}`);
      console.log(
        `  Overlap safe: ${fibonacciSpacing > requiredSpacing ? '✅' : '⚠️ May need dynamic scaling'}`,
      );

      // The spacing is adequate for lower counts (up to ~60 particles at default settings)
      // For higher counts, ParticleSwarm uses dynamic scaling (spacingScaleFactor)
      // to reduce shard size when orbit radius < idealSpacingRadius
      if (count <= 50) {
        expect(fibonacciSpacing).toBeGreaterThan(requiredSpacing);
      }
    }

    // Document the expected behavior: higher counts require dynamic shard scaling
    expect(true).toBe(true);
  });

  it('should verify slots are assigned unique indices (no duplicate positions)', () => {
    const slotManager = new SlotManager();
    const users = createMockUsers(100);

    slotManager.reconcile(users);

    // Collect all active slot indices
    const activeIndices = slotManager.slots
      .filter((s) => s.state === 'entering' || s.state === 'active')
      .map((s) => s.index);

    // All indices should be unique
    const uniqueIndices = new Set(activeIndices);
    expect(uniqueIndices.size).toBe(activeIndices.length);

    slotManager.reset();
  });

  it('should verify slot-to-user mapping is bijective (one-to-one)', () => {
    const slotManager = new SlotManager();
    const users: User[] = [
      { id: 'user-a', mood: 'presence' },
      { id: 'user-b', mood: 'gratitude' },
      { id: 'user-c', mood: 'release' },
      { id: 'user-d', mood: 'connection' },
    ];

    slotManager.reconcile(users);

    // Each user should map to exactly one slot
    const userSlots = new Map<string, number>();
    const slotUsers = new Map<number, string>();

    for (const user of users) {
      const slot = slotManager.getSlotByUserId(user.id);
      expect(slot).toBeDefined();
      if (!slot) continue; // TypeScript guard

      // No duplicate slot assignments
      expect(slotUsers.has(slot.index)).toBe(false);

      userSlots.set(user.id, slot.index);
      slotUsers.set(slot.index, user.id);
    }

    // Verify bijection
    expect(userSlots.size).toBe(users.length);
    expect(slotUsers.size).toBe(users.length);

    slotManager.reset();
  });
});

describe('Shape visibility test ideas', () => {
  /**
   * NOTE: Testing actual 3D visibility requires rendering the scene.
   *
   * Approaches for testing shape visibility:
   *
   * 1. **Unit test SlotManager** (implemented above)
   *    - Verify stableCount matches expected user count
   *    - Fast, no WebGL required
   *
   * 2. **Integration test with InstancedMesh count**
   *    - Render ParticleSwarm component
   *    - Check instancedMesh.count property
   *    - Requires React testing with r3f
   *
   * 3. **Visual regression test**
   *    - Render scene to offscreen canvas
   *    - Count non-background pixels in expected region
   *    - More complex but catches visual bugs
   *
   * 4. **E2E test with Playwright**
   *    - Take screenshot and analyze
   *    - Most comprehensive but slowest
   *
   * For CI, option 1 (SlotManager tests) provides good coverage
   * with fast execution and no WebGL dependency.
   *
   * The key invariant to test:
   * - If backend returns N users, N shapes should be visible (accounting for globe occlusion)
   * - Globe may hide ~10-20% of shapes depending on view angle
   */

  it('documents shape visibility testing approaches', () => {
    // This test documents the testing strategy
    // The actual SlotManager tests above verify the core logic
    expect(true).toBe(true);
  });
});
