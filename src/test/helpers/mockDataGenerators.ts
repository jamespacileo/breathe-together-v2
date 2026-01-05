/**
 * Mock Data Generators for Tests
 *
 * Reusable utilities for creating consistent test fixtures.
 */

import type { MoodId } from '../../constants';
import type { PresenceState } from '../../lib/presenceApi';

export interface User {
  id: string;
  mood: MoodId;
  country?: string;
}

/**
 * Create mock users with sequential IDs
 */
export function createMockUsers(count: number, mood: MoodId = 'presence'): User[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    mood,
  }));
}

/**
 * Create mock users with mixed moods based on counts
 */
export function createMockUsersWithMoods(moodCounts: Partial<Record<MoodId, number>>): User[] {
  const users: User[] = [];
  let userId = 0;

  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count && count > 0) {
      for (let i = 0; i < count; i++) {
        users.push({
          id: `${mood}-${userId++}`,
          mood: mood as MoodId,
        });
      }
    }
  }

  return users;
}

/**
 * Create mock presence state
 */
export function createMockPresence(config: {
  userCount?: number;
  moodDistribution?: Partial<Record<MoodId, number>>;
  includeCountryCounts?: boolean;
  timestamp?: number;
}): PresenceState {
  const {
    userCount = 42,
    moodDistribution = {
      presence: 0.35,
      gratitude: 0.3,
      release: 0.2,
      connection: 0.15,
    },
    includeCountryCounts = true,
    timestamp = Date.now(),
  } = config;

  // Calculate mood counts from distribution
  const moodCounts = {
    gratitude: Math.floor(userCount * (moodDistribution.gratitude || 0)),
    presence: Math.floor(userCount * (moodDistribution.presence || 0)),
    release: Math.floor(userCount * (moodDistribution.release || 0)),
    connection: Math.floor(userCount * (moodDistribution.connection || 0)),
  };

  // Adjust for rounding errors
  const totalMoodCount = Object.values(moodCounts).reduce((a, b) => a + b, 0);
  if (totalMoodCount < userCount) {
    moodCounts.presence += userCount - totalMoodCount;
  }

  // Create users
  const users = createMockUsersWithMoods(moodCounts);

  // Create country counts if requested
  const countryCounts: Record<string, number> = {};
  if (includeCountryCounts) {
    countryCounts.US = Math.floor(userCount * 0.4);
    countryCounts.GB = Math.floor(userCount * 0.2);
    countryCounts.JP = Math.floor(userCount * 0.15);
    countryCounts.DE = Math.floor(userCount * 0.15);
    countryCounts.AU =
      userCount - (countryCounts.US + countryCounts.GB + countryCounts.JP + countryCounts.DE);
  }

  return {
    count: userCount,
    moods: moodCounts,
    users,
    countryCounts,
    timestamp,
  };
}

/**
 * Create mock breath phase data
 */
export interface MockBreathPhase {
  breathPhase: number;
  phaseType: number;
  rawProgress: number;
  orbitRadius: number;
}

export function createMockBreathPhase(phase: number): MockBreathPhase {
  // Normalize phase to 0-1
  const normalizedPhase = ((phase % 1) + 1) % 1;

  return {
    breathPhase: normalizedPhase,
    phaseType:
      normalizedPhase < 0.25 ? 0 : normalizedPhase < 0.5 ? 1 : normalizedPhase < 0.75 ? 2 : 3,
    rawProgress: normalizedPhase,
    orbitRadius: 2.5 + normalizedPhase * 3.5, // Min 2.5, max 6
  };
}

/**
 * Create mock session ID
 */
export function createMockSessionId(): string {
  return `${Math.random().toString(36).substring(2, 10)}-${Date.now().toString(36)}`;
}
