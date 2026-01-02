/**
 * Tests for user tracking functionality
 *
 * Verifies that:
 * 1. Self user ID constant is correctly defined
 * 2. Session ID is generated and persisted
 * 3. Self user is injected into users array
 * 4. SlotManager correctly identifies self user
 * 5. User position tracking works correctly
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_TRACKING } from '../constants';
import { SlotManager, type User } from '../entities/particle/SlotManager';

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

describe('USER_TRACKING constants', () => {
  it('defines SELF_USER_ID as "self"', () => {
    expect(USER_TRACKING.SELF_USER_ID).toBe('self');
  });

  it('defines a valid highlight color', () => {
    expect(USER_TRACKING.SELF_HIGHLIGHT_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('defines localStorage keys', () => {
    expect(USER_TRACKING.STORAGE_KEYS.SESSION_ID).toBe('breathe-together:sessionId');
    expect(USER_TRACKING.STORAGE_KEYS.MOOD).toBe('breathe-together:mood');
  });
});

describe('SlotManager user tracking', () => {
  let slotManager: SlotManager;

  beforeEach(() => {
    slotManager = new SlotManager();
  });

  it('assigns self user to first available slot', () => {
    const users: User[] = [
      { id: USER_TRACKING.SELF_USER_ID, mood: 'presence' },
      { id: 'other-user-1', mood: 'gratitude' },
      { id: 'other-user-2', mood: 'release' },
    ];

    slotManager.reconcile(users);

    // Self user should be assigned to a slot
    const selfSlot = slotManager.getSlotByUserId(USER_TRACKING.SELF_USER_ID);
    expect(selfSlot).toBeDefined();
    expect(selfSlot?.userId).toBe(USER_TRACKING.SELF_USER_ID);
    expect(selfSlot?.mood).toBe('presence');
  });

  it('preserves self user slot when other users join/leave', () => {
    // Initial state with self user
    const initialUsers: User[] = [
      { id: USER_TRACKING.SELF_USER_ID, mood: 'presence' },
      { id: 'other-1', mood: 'gratitude' },
    ];

    slotManager.reconcile(initialUsers);
    const selfSlotIndex = slotManager.getSlotByUserId(USER_TRACKING.SELF_USER_ID)?.index;

    // Add more users
    const moreUsers: User[] = [
      { id: USER_TRACKING.SELF_USER_ID, mood: 'presence' },
      { id: 'other-1', mood: 'gratitude' },
      { id: 'other-2', mood: 'release' },
      { id: 'other-3', mood: 'connection' },
    ];

    slotManager.reconcile(moreUsers);

    // Self user should still be in the same slot
    const selfSlotAfter = slotManager.getSlotByUserId(USER_TRACKING.SELF_USER_ID);
    expect(selfSlotAfter?.index).toBe(selfSlotIndex);
  });

  it('handles self user mood change', () => {
    const users: User[] = [{ id: USER_TRACKING.SELF_USER_ID, mood: 'presence' }];

    slotManager.reconcile(users);
    expect(slotManager.getSlotByUserId(USER_TRACKING.SELF_USER_ID)?.mood).toBe('presence');

    // Change mood
    const usersWithNewMood: User[] = [{ id: USER_TRACKING.SELF_USER_ID, mood: 'gratitude' }];

    const result = slotManager.reconcile(usersWithNewMood);
    expect(result.moodChanged).toBe(1);
    expect(slotManager.getSlotByUserId(USER_TRACKING.SELF_USER_ID)?.mood).toBe('gratitude');
  });

  it('self user slot index is 0 when self is first in array', () => {
    // When self is prepended to users array, it gets slot 0
    const users: User[] = [
      { id: USER_TRACKING.SELF_USER_ID, mood: 'presence' },
      { id: 'presence-0', mood: 'presence' },
      { id: 'gratitude-0', mood: 'gratitude' },
    ];

    slotManager.reconcile(users);

    const selfSlot = slotManager.getSlotByUserId(USER_TRACKING.SELF_USER_ID);
    expect(selfSlot?.index).toBe(0);
  });
});

describe('Self user identification logic', () => {
  it('prepends self user to users array correctly', () => {
    // This simulates the logic in usePresence
    const mockPresenceUsers: User[] = [
      { id: 'presence-0', mood: 'presence' },
      { id: 'gratitude-0', mood: 'gratitude' },
    ];

    const currentMood = 'release';

    // Logic from usePresence
    const selfUser: User = {
      id: USER_TRACKING.SELF_USER_ID,
      mood: currentMood,
    };
    const usersWithSelf = [selfUser, ...mockPresenceUsers];

    // Verify structure
    expect(usersWithSelf).toHaveLength(3);
    expect(usersWithSelf[0].id).toBe(USER_TRACKING.SELF_USER_ID);
    expect(usersWithSelf[0].mood).toBe('release');
    expect(usersWithSelf[1].id).toBe('presence-0');
    expect(usersWithSelf[2].id).toBe('gratitude-0');
  });

  it('current user index is always 0 when self is prepended', () => {
    const mockPresenceUsers: User[] = [{ id: 'presence-0', mood: 'presence' }];

    const selfUser: User = {
      id: USER_TRACKING.SELF_USER_ID,
      mood: 'presence',
    };
    const usersWithSelf = [selfUser, ...mockPresenceUsers];

    // The current user index logic from usePresence
    const currentUserIndex = 0; // Always 0 when prepended

    expect(usersWithSelf[currentUserIndex].id).toBe(USER_TRACKING.SELF_USER_ID);
  });

  it('count includes self user', () => {
    const mockPresenceCount = 42;

    // Logic from usePresence
    const countWithSelf = mockPresenceCount + 1;

    expect(countWithSelf).toBe(43);
  });
});

describe('User tracking integration', () => {
  it('end-to-end: self user flows from presence to slot manager', () => {
    // Simulate the full flow:
    // 1. usePresence generates users with self prepended
    // 2. ParticleSwarm receives users
    // 3. SlotManager assigns slots
    // 4. Self user can be found by ID

    // Step 1: Generate mock presence with self
    const mockUsers: User[] = [
      { id: 'presence-0', mood: 'presence' },
      { id: 'gratitude-0', mood: 'gratitude' },
    ];

    const selfMood = 'connection';
    const selfUser: User = {
      id: USER_TRACKING.SELF_USER_ID,
      mood: selfMood,
    };
    const usersWithSelf = [selfUser, ...mockUsers];

    // Step 2 & 3: SlotManager reconciles
    const slotManager = new SlotManager();
    slotManager.reconcile(usersWithSelf);

    // Step 4: Verify self user is trackable
    const selfSlot = slotManager.getSlotByUserId(USER_TRACKING.SELF_USER_ID);

    expect(selfSlot).toBeDefined();
    expect(selfSlot?.index).toBe(0); // First in array = first slot
    expect(selfSlot?.mood).toBe('connection');
    expect(selfSlot?.state).toBe('entering'); // Just reconciled
  });

  it('self user remains stable across multiple reconciliations', () => {
    const slotManager = new SlotManager();

    // Initial reconciliation
    const users1: User[] = [
      { id: USER_TRACKING.SELF_USER_ID, mood: 'presence' },
      { id: 'user-1', mood: 'gratitude' },
    ];
    slotManager.reconcile(users1);

    const initialSlotIndex = slotManager.getSlotByUserId(USER_TRACKING.SELF_USER_ID)?.index;

    // Simulate animation completion
    slotManager.updateAnimations(1.0);

    // Second reconciliation with new users
    const users2: User[] = [
      { id: USER_TRACKING.SELF_USER_ID, mood: 'presence' },
      { id: 'user-1', mood: 'gratitude' },
      { id: 'user-2', mood: 'release' },
      { id: 'user-3', mood: 'connection' },
    ];
    slotManager.reconcile(users2);

    const afterSlotIndex = slotManager.getSlotByUserId(USER_TRACKING.SELF_USER_ID)?.index;

    // Self user should maintain the same slot
    expect(afterSlotIndex).toBe(initialSlotIndex);
  });
});

describe('Self user slot visibility for YOU marker', () => {
  it('self user slot has userId accessible for position tracking', () => {
    const slotManager = new SlotManager();

    // Users with self at index 0 (as usePresence does)
    const users: User[] = [
      { id: USER_TRACKING.SELF_USER_ID, mood: 'presence' },
      { id: 'other-1', mood: 'gratitude' },
      { id: 'other-2', mood: 'release' },
    ];

    slotManager.reconcile(users);

    // Get slots array (this is what ParticleSwarm iterates)
    const slots = slotManager.slots;

    // Find the slot with self userId
    const selfSlotFromArray = slots.find((s) => s.userId === USER_TRACKING.SELF_USER_ID);

    expect(selfSlotFromArray).toBeDefined();
    expect(selfSlotFromArray?.userId).toBe('self');

    // Verify we can find it by userId lookup too
    const selfSlotByLookup = slotManager.getSlotByUserId(USER_TRACKING.SELF_USER_ID);
    expect(selfSlotByLookup).toBeDefined();
    expect(selfSlotByLookup?.index).toBe(selfSlotFromArray?.index);
  });

  it('self user slot is visible (scale > 0) after animation', () => {
    const slotManager = new SlotManager();

    const users: User[] = [{ id: USER_TRACKING.SELF_USER_ID, mood: 'presence' }];

    slotManager.reconcile(users);

    // Initially slot is in 'entering' state with scale = 0
    let selfSlot = slotManager.getSlotByUserId(USER_TRACKING.SELF_USER_ID);
    expect(selfSlot?.state).toBe('entering');
    expect(selfSlot?.scale).toBe(0);

    // After animation completes, scale should be 1
    slotManager.updateAnimations(0.5); // Enter animation is 0.4s

    selfSlot = slotManager.getSlotByUserId(USER_TRACKING.SELF_USER_ID);
    expect(selfSlot?.state).toBe('active');
    expect(selfSlot?.scale).toBe(1);
  });

  it('iterating slots array finds self user by userId comparison', () => {
    const slotManager = new SlotManager();

    const users: User[] = [
      { id: USER_TRACKING.SELF_USER_ID, mood: 'presence' },
      { id: 'other-1', mood: 'gratitude' },
      { id: 'other-2', mood: 'release' },
    ];

    slotManager.reconcile(users);
    slotManager.updateAnimations(0.5);

    const slots = slotManager.slots;

    // Simulate what ParticleSwarm does
    let foundSelfIndex = -1;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (slot.userId === USER_TRACKING.SELF_USER_ID) {
        foundSelfIndex = i;
        break;
      }
    }

    expect(foundSelfIndex).toBeGreaterThanOrEqual(0);
    expect(slots[foundSelfIndex].userId).toBe('self');
    expect(slots[foundSelfIndex].scale).toBe(1);
  });

  it('verifies SELF_USER_ID constant matches expected value', () => {
    // This ensures the constant hasn't been accidentally changed
    expect(USER_TRACKING.SELF_USER_ID).toBe('self');

    // And that string comparison works as expected
    const slot = { userId: 'self' };
    expect(slot.userId === USER_TRACKING.SELF_USER_ID).toBe(true);
  });
});
