/**
 * Mock presence data generator for development
 * Simulates diverse users with different moods
 */

import type { MoodId } from '../constants';

export interface MockPresenceData {
  count: number;
  moods: Record<MoodId, number>;
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
 */
export function generateMockPresence(userCount: number): MockPresenceData {
  const moods: Record<MoodId, number> = {
    presence: Math.floor(userCount * 0.35),
    gratitude: Math.floor(userCount * 0.3),
    release: Math.floor(userCount * 0.2),
    connection: Math.floor(userCount * 0.15),
  };

  return {
    count: userCount,
    moods,
  };
}
