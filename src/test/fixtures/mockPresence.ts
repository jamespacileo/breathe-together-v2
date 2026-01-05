/**
 * Mock presence data generator for development
 * Simulates diverse users with different moods and countries
 */

import type { MoodId } from '../constants';

export interface MockUser {
  id: string;
  mood: MoodId;
  country?: string;
}

export interface MockPresenceData {
  count: number;
  moods: Record<MoodId, number>;
  users: MockUser[];
  countryCounts: Record<string, number>;
}

/**
 * Sample countries for mock users (weighted by typical global distribution)
 */
const MOCK_COUNTRIES = [
  { code: 'US', weight: 20 },
  { code: 'GB', weight: 8 },
  { code: 'DE', weight: 6 },
  { code: 'FR', weight: 5 },
  { code: 'JP', weight: 8 },
  { code: 'AU', weight: 4 },
  { code: 'CA', weight: 4 },
  { code: 'BR', weight: 6 },
  { code: 'IN', weight: 10 },
  { code: 'CN', weight: 10 },
  { code: 'MX', weight: 4 },
  { code: 'ES', weight: 3 },
  { code: 'IT', weight: 3 },
  { code: 'NL', weight: 2 },
  { code: 'SE', weight: 2 },
  { code: 'KR', weight: 3 },
  { code: 'SG', weight: 2 },
];

const TOTAL_WEIGHT = MOCK_COUNTRIES.reduce((sum, c) => sum + c.weight, 0);

/**
 * Get a deterministic country for a mock user based on index
 */
function getMockCountry(index: number): string {
  // Use index as seed for deterministic selection
  const pseudoRandom = ((index * 1103515245 + 12345) >>> 16) % TOTAL_WEIGHT;

  let cumulative = 0;
  for (const country of MOCK_COUNTRIES) {
    cumulative += country.weight;
    if (pseudoRandom < cumulative) {
      return country.code;
    }
  }
  return MOCK_COUNTRIES[0].code;
}

/**
 * Options for injecting the current user into mock data
 */
export interface CurrentUserOptions {
  /** Current user's session ID (stable UUID) */
  sessionId: string;
  /** Current user's selected mood */
  mood: MoodId;
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
 * @param userCount - Total number of users (including current user if provided)
 * @param currentUser - Optional current user to inject at index 0
 */
export function generateMockPresence(
  userCount: number,
  currentUser?: CurrentUserOptions,
): MockPresenceData {
  // Adjust count for mock users (subtract 1 if current user is included)
  const mockUserCount = currentUser ? userCount - 1 : userCount;

  const moods: Record<MoodId, number> = {
    presence: Math.floor(mockUserCount * 0.35),
    gratitude: Math.floor(mockUserCount * 0.3),
    release: Math.floor(mockUserCount * 0.2),
    connection: Math.floor(mockUserCount * 0.15),
  };

  // Generate stable mock users with deterministic IDs and countries
  const users: MockUser[] = [];
  const countryCounts: Record<string, number> = {};
  const moodKeys: MoodId[] = ['presence', 'gratitude', 'release', 'connection'];

  // Add current user at index 0 if provided
  // This ensures the current user always has a stable position (slot 0)
  if (currentUser) {
    users.push({
      id: currentUser.sessionId,
      mood: currentUser.mood,
      country: 'US', // Default country for current user in mock
    });
    countryCounts.US = 1;
    // Increment the mood count for the current user's mood
    moods[currentUser.mood]++;
  }

  let globalIndex = 0;
  for (const mood of moodKeys) {
    for (let i = 0; i < moods[mood] - (currentUser?.mood === mood ? 1 : 0); i++) {
      const country = getMockCountry(globalIndex);
      users.push({ id: `${mood}-${i}`, mood, country });
      countryCounts[country] = (countryCounts[country] || 0) + 1;
      globalIndex++;
    }
  }

  return {
    count: userCount,
    moods,
    users,
    countryCounts,
  };
}
