/**
 * Mock presence data generator for development
 * Simulates diverse users with different moods
 *
 * Updated (Dec 2024): Now generates individual users with unique IDs
 * for slot-based ordering system.
 */

import type { MoodId } from '../constants';
import { MOOD_IDS } from '../constants';
import type { User } from '../entities/particle/SlotManager';

export interface MockPresenceData {
  count: number;
  moods: Record<MoodId, number>;
  /** Individual users with IDs (for slot-based system) */
  users: User[];
}

/**
 * Seeded random number generator for deterministic user generation
 * Allows consistent user IDs across re-renders
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * Generate a deterministic user ID based on index and seed
 */
function generateUserId(index: number, seed: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const random = seededRandom(seed + index * 1000);
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(random() * chars.length)];
  }
  return `user_${id}`;
}

/**
 * Mood distribution percentages
 * Total = 100%
 */
const MOOD_DISTRIBUTION: Record<MoodId, number> = {
  presence: 0.35, // 35% - Simply being here
  gratitude: 0.3, // 30% - Appreciation
  release: 0.2, // 20% - Letting go
  connection: 0.15, // 15% - Here with others
};

/**
 * Generate mock presence data with realistic mood distribution
 *
 * Distribution (simplified 4-category system):
 * - 35% presence (simply being here - covers calm, curiosity, rest)
 * - 30% gratitude (appreciation, thankfulness)
 * - 20% release (letting go, processing, unwinding)
 * - 15% connection (here with others, community)
 *
 * @param userCount Target number of users
 * @param seed Optional seed for deterministic generation
 */
export function generateMockPresence(userCount: number, seed = 12345): MockPresenceData {
  const moods: Record<MoodId, number> = {
    presence: 0,
    gratitude: 0,
    release: 0,
    connection: 0,
  };

  const users: User[] = [];
  const random = seededRandom(seed);

  // Generate individual users with mood assignment
  for (let i = 0; i < userCount; i++) {
    // Assign mood based on distribution
    const moodRoll = random();
    let cumulativeProbability = 0;
    let assignedMood: MoodId = 'presence';

    for (const moodId of MOOD_IDS) {
      cumulativeProbability += MOOD_DISTRIBUTION[moodId];
      if (moodRoll <= cumulativeProbability) {
        assignedMood = moodId;
        break;
      }
    }

    // Increment mood count
    moods[assignedMood]++;

    // Create user with deterministic ID and staggered join time
    // Users "join" at different times to simulate real arrival order
    const joinOffset = i * 100 + Math.floor(random() * 50);
    users.push({
      id: generateUserId(i, seed),
      mood: assignedMood,
      joinedAt: joinOffset,
    });
  }

  return {
    count: userCount,
    moods,
    users,
  };
}

/**
 * Simulate user churn (users joining and leaving)
 *
 * Creates a more dynamic presence simulation where users
 * randomly join and leave over time.
 *
 * @param currentUsers Current user list
 * @param targetCount Target user count
 * @param churnRate Probability of user leaving per update (0-1)
 * @param seed Random seed
 */
export function simulateUserChurn(
  currentUsers: User[],
  targetCount: number,
  churnRate = 0.05,
  seed = Date.now(),
): User[] {
  const random = seededRandom(seed);
  const newUsers = [...currentUsers];

  // Remove users based on churn rate
  for (let i = newUsers.length - 1; i >= 0; i--) {
    if (random() < churnRate) {
      newUsers.splice(i, 1);
    }
  }

  // Add new users to reach target count
  while (newUsers.length < targetCount) {
    const index = newUsers.length + Math.floor(random() * 10000);
    const moodRoll = random();
    let cumulativeProbability = 0;
    let assignedMood: MoodId = 'presence';

    for (const moodId of MOOD_IDS) {
      cumulativeProbability += MOOD_DISTRIBUTION[moodId];
      if (moodRoll <= cumulativeProbability) {
        assignedMood = moodId;
        break;
      }
    }

    newUsers.push({
      id: generateUserId(index, seed + index),
      mood: assignedMood,
      joinedAt: Date.now(),
    });
  }

  return newUsers;
}

/**
 * Calculate mood counts from user array
 * Utility for backward compatibility
 */
export function calculateMoodCounts(users: User[]): Record<MoodId, number> {
  const counts: Record<MoodId, number> = {
    presence: 0,
    gratitude: 0,
    release: 0,
    connection: 0,
  };

  for (const user of users) {
    counts[user.mood]++;
  }

  return counts;
}
