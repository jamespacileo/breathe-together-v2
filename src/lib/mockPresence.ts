/**
 * Mock presence data generator for development
 * Simulates diverse users with different moods and countries
 */

import type { MoodId } from '../constants';

export interface MockUser {
  id: string;
  mood: MoodId;
  /** ISO 3166-1 alpha-2 country code */
  country?: string;
}

export interface MockPresenceData {
  count: number;
  moods: Record<MoodId, number>;
  /** User counts per country */
  countries: Record<string, number>;
  users: MockUser[];
}

/**
 * Country distribution for mock data (realistic global meditation community)
 */
const MOCK_COUNTRY_DISTRIBUTION: Record<string, number> = {
  US: 0.25,
  GB: 0.1,
  DE: 0.08,
  FR: 0.06,
  JP: 0.06,
  AU: 0.05,
  CA: 0.05,
  BR: 0.04,
  IN: 0.04,
  NL: 0.03,
  ES: 0.03,
  IT: 0.03,
  SE: 0.02,
  MX: 0.02,
  KR: 0.02,
  PL: 0.02,
  AR: 0.02,
  NZ: 0.02,
  CH: 0.02,
  BE: 0.02,
  PT: 0.01,
  ZA: 0.01,
};

/**
 * Assign a country based on deterministic index
 */
function assignCountry(index: number, totalUsers: number): string {
  const countries = Object.entries(MOCK_COUNTRY_DISTRIBUTION);
  let cumulative = 0;
  const threshold = (index % totalUsers) / totalUsers;

  for (const [country, weight] of countries) {
    cumulative += weight;
    if (threshold < cumulative) {
      return country;
    }
  }

  return 'US'; // Fallback
}

/**
 * Generate mock presence data with realistic mood and country distribution
 * Total allocation: 100% of users distributed across 4 moods
 *
 * Distribution (simplified 4-category system):
 * - 35% presence (simply being here - covers calm, curiosity, rest)
 * - 30% gratitude (appreciation, thankfulness)
 * - 20% release (letting go, processing, unwinding)
 * - 15% connection (here with others, community)
 */
export function generateMockPresence(userCount: number): MockPresenceData {
  const moods: Record<MoodId, number> = {
    presence: Math.floor(userCount * 0.35),
    gratitude: Math.floor(userCount * 0.3),
    release: Math.floor(userCount * 0.2),
    connection: Math.floor(userCount * 0.15),
  };

  // Generate country counts
  const countries: Record<string, number> = {};
  for (const [country, ratio] of Object.entries(MOCK_COUNTRY_DISTRIBUTION)) {
    const count = Math.floor(userCount * ratio);
    if (count > 0) {
      countries[country] = count;
    }
  }

  // Generate stable mock users with deterministic IDs and countries
  const users: MockUser[] = [];
  const moodKeys: MoodId[] = ['presence', 'gratitude', 'release', 'connection'];
  let globalIndex = 0;

  for (const mood of moodKeys) {
    for (let i = 0; i < moods[mood]; i++) {
      const country = assignCountry(globalIndex, userCount);
      users.push({ id: `${mood}-${i}`, mood, country });
      globalIndex++;
    }
  }

  return {
    count: userCount,
    moods,
    countries,
    users,
  };
}
