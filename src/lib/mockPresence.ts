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
 * Total allocation: 100% of users distributed across moods
 *
 * Distribution:
 * - 25% moment (taking a moment, present)
 * - 20% grateful (appreciation, celebration)
 * - 15% anxious (releasing tension)
 * - 15% processing (working through feelings)
 * - 10% preparing (getting ready)
 * - 10% here (just here, minimal engagement)
 * - 5% celebrating (joy)
 */
export function generateMockPresence(userCount: number): MockPresenceData {
  const moods: Record<MoodId, number> = {
    moment: Math.floor(userCount * 0.25),
    grateful: Math.floor(userCount * 0.2),
    anxious: Math.floor(userCount * 0.15),
    processing: Math.floor(userCount * 0.15),
    preparing: Math.floor(userCount * 0.1),
    here: Math.floor(userCount * 0.1),
    celebrating: Math.floor(userCount * 0.05),
  };

  return {
    count: userCount,
    moods,
  };
}
