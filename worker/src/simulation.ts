/**
 * User Simulation Module
 *
 * Generates simulated users (NPCs) for testing the breathing meditation app
 * with various concurrent user counts. Designed to be modular and easily
 * enabled/disabled via config.ts.
 *
 * Features:
 * - Configurable base user count
 * - Dynamic arrivals/departures for realistic testing
 * - Consistent mood distribution
 * - Deterministic IDs for stable slot-based rendering
 */

import { SIMULATION_CONFIG } from './config';
import type { MoodId, User } from './types';

/** Internal state for dynamic user simulation */
interface SimulationState {
  /** Current count offset from base (for fluctuation) */
  currentOffset: number;
  /** Timestamp of last fluctuation */
  lastFluctuationAt: number;
  /** Cached simulated users (regenerated on count change) */
  cachedUsers: User[];
  /** Current user count */
  currentCount: number;
}

// Module-level state (persists across requests within same isolate)
let state: SimulationState = {
  currentOffset: 0,
  lastFluctuationAt: Date.now(),
  cachedUsers: [],
  currentCount: 0,
};

/**
 * Initialize or reset simulation state
 */
export function resetSimulation(): void {
  state = {
    currentOffset: 0,
    lastFluctuationAt: Date.now(),
    cachedUsers: [],
    currentCount: 0,
  };
}

/**
 * Check if simulation is enabled
 */
export function isSimulationEnabled(): boolean {
  return SIMULATION_CONFIG.enabled;
}

/**
 * Get the current simulated user count
 * Updates dynamically based on config settings
 */
export function getSimulatedUserCount(): number {
  if (!SIMULATION_CONFIG.enabled) {
    return 0;
  }

  const now = Date.now();
  const config = SIMULATION_CONFIG;

  // Check if we should fluctuate
  if (config.dynamicUsers && now - state.lastFluctuationAt > config.fluctuationIntervalMs) {
    // Random walk: add +1 or -1 to current offset
    const [minDelta, maxDelta] = config.fluctuationRange;
    const step = Math.random() > 0.5 ? 1 : -1;
    const newOffset = state.currentOffset + step;

    // Clamp within configured bounds
    const clampedOffset = Math.max(minDelta, Math.min(maxDelta, newOffset));

    state.currentOffset = clampedOffset;
    state.lastFluctuationAt = now;
  }

  return Math.max(0, config.baseUserCount + state.currentOffset);
}

/**
 * Assign a country to a user based on deterministic index
 * Uses weighted distribution from config
 */
function assignCountry(index: number, totalUsers: number): string {
  const config = SIMULATION_CONFIG;
  const countries = Object.entries(config.countryDistribution);

  // Use deterministic assignment based on index
  let cumulative = 0;
  const threshold = (index % totalUsers) / totalUsers;

  for (const [country, weight] of countries) {
    cumulative += weight;
    if (threshold < cumulative) {
      return country;
    }
  }

  // Fallback to first country if rounding issues
  return countries[0]?.[0] ?? 'US';
}

/**
 * Generate simulated users with stable IDs and configured mood distribution
 *
 * @param count - Number of users to generate
 * @returns Array of simulated users
 */
export function generateSimulatedUsers(count: number): User[] {
  if (!SIMULATION_CONFIG.enabled || count <= 0) {
    return [];
  }

  // Use cached users if count hasn't changed
  if (count === state.currentCount && state.cachedUsers.length === count) {
    return state.cachedUsers;
  }

  const config = SIMULATION_CONFIG;
  const users: User[] = [];

  // Calculate user counts per mood based on distribution
  const moodCounts: Record<MoodId, number> = {
    presence: Math.floor(count * config.moodDistribution.presence),
    gratitude: Math.floor(count * config.moodDistribution.gratitude),
    release: Math.floor(count * config.moodDistribution.release),
    connection: Math.floor(count * config.moodDistribution.connection),
  };

  // Distribute any remaining users (due to rounding) to presence
  const assigned = Object.values(moodCounts).reduce((a, b) => a + b, 0);
  moodCounts.presence += count - assigned;

  // Generate users with stable, deterministic IDs
  // ID format: "sim-{mood}-{index}" for predictable ordering
  const moods: MoodId[] = ['presence', 'gratitude', 'release', 'connection'];

  let globalIndex = 0;
  for (const mood of moods) {
    for (let i = 0; i < moodCounts[mood]; i++) {
      const country = assignCountry(globalIndex, count);
      users.push({
        id: `sim-${mood}-${i.toString().padStart(4, '0')}`,
        mood,
        country,
      });
      globalIndex++;
    }
  }

  // Sort by ID for consistent ordering across all clients
  users.sort((a, b) => a.id.localeCompare(b.id));

  // Cache for next request
  state.currentCount = count;
  state.cachedUsers = users;

  return users;
}

/**
 * Get simulated mood counts for the current user count
 */
export function getSimulatedMoodCounts(): Record<MoodId, number> {
  const count = getSimulatedUserCount();
  const config = SIMULATION_CONFIG;

  if (!config.enabled || count <= 0) {
    return { presence: 0, gratitude: 0, release: 0, connection: 0 };
  }

  const counts: Record<MoodId, number> = {
    presence: Math.floor(count * config.moodDistribution.presence),
    gratitude: Math.floor(count * config.moodDistribution.gratitude),
    release: Math.floor(count * config.moodDistribution.release),
    connection: Math.floor(count * config.moodDistribution.connection),
  };

  // Distribute remainder to presence
  const assigned = Object.values(counts).reduce((a, b) => a + b, 0);
  counts.presence += count - assigned;

  return counts;
}

/**
 * Merge simulated users with real users
 * Real users take precedence (simulated users are additive)
 *
 * @param realUsers - Users from actual connections
 * @returns Combined user list
 */
export function mergeWithSimulatedUsers(realUsers: User[]): User[] {
  if (!SIMULATION_CONFIG.enabled) {
    return realUsers;
  }

  const simulatedCount = getSimulatedUserCount();
  const simulatedUsers = generateSimulatedUsers(simulatedCount);

  // Combine and sort by ID for consistent ordering
  const combined = [...realUsers, ...simulatedUsers];
  combined.sort((a, b) => a.id.localeCompare(b.id));

  return combined;
}

/**
 * Merge simulated mood counts with real mood counts
 */
export function mergeWithSimulatedMoods(realMoods: Record<MoodId, number>): Record<MoodId, number> {
  if (!SIMULATION_CONFIG.enabled) {
    return realMoods;
  }

  const simMoods = getSimulatedMoodCounts();

  return {
    presence: realMoods.presence + simMoods.presence,
    gratitude: realMoods.gratitude + simMoods.gratitude,
    release: realMoods.release + simMoods.release,
    connection: realMoods.connection + simMoods.connection,
  };
}

/**
 * Get simulated country counts for the current user count
 */
export function getSimulatedCountryCounts(): Record<string, number> {
  const count = getSimulatedUserCount();
  const config = SIMULATION_CONFIG;

  if (!config.enabled || count <= 0) {
    return {};
  }

  const counts: Record<string, number> = {};

  for (const [country, ratio] of Object.entries(config.countryDistribution)) {
    const countryCount = Math.floor(count * ratio);
    if (countryCount > 0) {
      counts[country] = countryCount;
    }
  }

  return counts;
}
