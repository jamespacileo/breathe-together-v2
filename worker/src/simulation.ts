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

/**
 * Sample countries for simulated users (for testing geo markers)
 * Weighted by population centers to simulate realistic distribution
 */
const SIMULATED_COUNTRIES = [
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

// Pre-compute cumulative weights for weighted random selection
const COUNTRY_CUMULATIVE_WEIGHTS: number[] = [];
let cumulativeWeight = 0;
for (const country of SIMULATED_COUNTRIES) {
  cumulativeWeight += country.weight;
  COUNTRY_CUMULATIVE_WEIGHTS.push(cumulativeWeight);
}
const TOTAL_COUNTRY_WEIGHT = cumulativeWeight;

/**
 * Get a deterministic country for a simulated user based on their index
 */
function getSimulatedCountry(index: number): string {
  // Use index as seed for deterministic "random" selection
  const pseudoRandom = ((index * 1103515245 + 12345) >>> 16) % TOTAL_COUNTRY_WEIGHT;

  for (let i = 0; i < COUNTRY_CUMULATIVE_WEIGHTS.length; i++) {
    if (pseudoRandom < COUNTRY_CUMULATIVE_WEIGHTS[i]) {
      return SIMULATED_COUNTRIES[i].code;
    }
  }
  return SIMULATED_COUNTRIES[0].code;
}

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
      users.push({
        id: `sim-${mood}-${i.toString().padStart(4, '0')}`,
        mood,
        country: getSimulatedCountry(globalIndex),
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

  if (!SIMULATION_CONFIG.enabled || count <= 0) {
    return {};
  }

  const users = generateSimulatedUsers(count);
  const countryCounts: Record<string, number> = {};

  for (const user of users) {
    if (user.country) {
      countryCounts[user.country] = (countryCounts[user.country] || 0) + 1;
    }
  }

  return countryCounts;
}
