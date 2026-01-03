/**
 * Mock presence data generator for development
 * Simulates diverse users with different moods in ARRIVAL ORDER
 *
 * Key design: Users are ordered by when they "joined" (arrival order),
 * NOT grouped by mood. This ensures each user has a stable position
 * on the Fibonacci sphere based on their join order.
 */

import type { MoodId } from '../constants';

export interface MockUser {
  id: string;
  mood: MoodId;
  /** Join timestamp (milliseconds since epoch) - determines position in array */
  joinedAt: number;
}

export interface MockPresenceData {
  count: number;
  moods: Record<MoodId, number>;
  users: MockUser[];
}

/**
 * Seeded random number generator for deterministic mock data
 * Produces same sequence of numbers for same seed
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    // LCG parameters (same as glibc)
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Generate mock presence data with realistic mood distribution
 * Total allocation: 100% of users distributed across 4 moods
 *
 * Distribution (simplified 4-category system):
 * - 35% presence (simply being here - covers calm, curiosity, rest)
 * - 30% gratitude (appreciation, thankfulness)
 * - 20% release (letting go, processing, unwinding)
 * - 15% connection (here with others, community)
 *
 * IMPORTANT: Users are generated in ARRIVAL ORDER, not grouped by mood.
 * This simulates real-world behavior where users join at random times
 * with various moods. Each user's position on the sphere is determined
 * by their index in this array (arrival order).
 *
 * @param userCount - Number of mock users to generate
 * @param seed - Optional seed for deterministic generation (default: 12345)
 */
export function generateMockPresence(userCount: number, seed = 12345): MockPresenceData {
  const moods: Record<MoodId, number> = {
    presence: 0,
    gratitude: 0,
    release: 0,
    connection: 0,
  };

  // Mood probabilities matching the target distribution
  const moodProbabilities: [MoodId, number][] = [
    ['presence', 0.35],
    ['gratitude', 0.3],
    ['release', 0.2],
    ['connection', 0.15],
  ];

  // Generate users in arrival order with deterministic random moods
  const random = seededRandom(seed);
  const users: MockUser[] = [];

  // Base timestamp - users "joined" starting from this time
  const baseTime = 1704067200000; // 2024-01-01 00:00:00 UTC

  for (let i = 0; i < userCount; i++) {
    // Pick mood based on weighted random selection
    const roll = random();
    let cumulative = 0;
    let selectedMood: MoodId = 'presence';

    for (const [mood, probability] of moodProbabilities) {
      cumulative += probability;
      if (roll < cumulative) {
        selectedMood = mood;
        break;
      }
    }

    moods[selectedMood]++;

    // User ID is based on arrival order, not mood
    // This ensures stable identity regardless of mood changes
    users.push({
      id: `user-${i}`,
      mood: selectedMood,
      // Simulate staggered join times (1-60 seconds apart)
      joinedAt: baseTime + i * (1000 + Math.floor(random() * 59000)),
    });
  }

  return {
    count: userCount,
    moods,
    users,
  };
}

/**
 * Simulate a user joining the session
 * Returns a new user with the next available ID
 *
 * @param existingUsers - Current users array
 * @param mood - Mood for the new user
 */
export function addMockUser(existingUsers: MockUser[], mood: MoodId): MockUser {
  const nextId = existingUsers.length;
  return {
    id: `user-${nextId}`,
    mood,
    joinedAt: Date.now(),
  };
}

/**
 * Simulate a user leaving the session
 * Returns new array without the specified user (maintains order of remaining)
 *
 * @param existingUsers - Current users array
 * @param userId - ID of user to remove
 */
export function removeMockUser(existingUsers: MockUser[], userId: string): MockUser[] {
  return existingUsers.filter((u) => u.id !== userId);
}
