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
