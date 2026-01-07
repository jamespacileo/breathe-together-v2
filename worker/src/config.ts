/**
 * Worker Configuration
 *
 * Centralized configuration for the presence API worker.
 * Modify this file to adjust behavior without changing implementation code.
 */

import { readBool, readInt } from './config/env';
import type { MoodId } from './types';

// =============================================================================
// Simulation Configuration
// =============================================================================

export interface SimulationConfig {
  /** Enable simulated users (NPCs) for testing */
  enabled: boolean;

  /** Base number of simulated users always present */
  baseUserCount: number;

  /** Enable dynamic user arrivals/departures */
  dynamicUsers: boolean;

  /** Range for random user fluctuation [min, max] */
  fluctuationRange: [number, number];

  /** How often to add/remove users (in milliseconds) */
  fluctuationIntervalMs: number;

  /** Mood distribution for simulated users (must sum to 1.0) */
  moodDistribution: Record<MoodId, number>;
}

export const SIMULATION_CONFIG: SimulationConfig = {
  // Disabled by default (safe for production). Enable via env for local/dev.
  enabled: false,

  // Base number of NPCs always present
  baseUserCount: 0,

  // Enable random arrivals/departures for realistic testing
  dynamicUsers: false,

  // Users can fluctuate by -5 to +5 from base
  fluctuationRange: [-5, 5],

  // Check for arrivals/departures every 3 seconds
  fluctuationIntervalMs: 3000,

  // Mood distribution (mirrors real-world meditation intentions)
  moodDistribution: {
    presence: 0.35, // Simply being here
    gratitude: 0.3, // Appreciation
    release: 0.2, // Letting go
    connection: 0.15, // Community
  },
};

/**
 * Apply environment-driven overrides to module-level config.
 *
 * Supported vars:
 * - `SIMULATION_ENABLED=true|false`
 * - `SIMULATION_BASE_USER_COUNT=<int>`
 * - `SIMULATION_DYNAMIC_USERS=true|false`
 * - `SIMULATION_FLUCTUATION_MIN=<int>`
 * - `SIMULATION_FLUCTUATION_MAX=<int>`
 * - `SIMULATION_FLUCTUATION_INTERVAL_MS=<int>`
 */
export function configureWorkerFromEnv(env: Record<string, unknown>): void {
  const enabled = readBool(env.SIMULATION_ENABLED);
  if (enabled !== undefined) SIMULATION_CONFIG.enabled = enabled;

  const base = readInt(env.SIMULATION_BASE_USER_COUNT);
  if (base !== undefined) SIMULATION_CONFIG.baseUserCount = Math.max(0, base);

  const dynamicUsers = readBool(env.SIMULATION_DYNAMIC_USERS);
  if (dynamicUsers !== undefined) SIMULATION_CONFIG.dynamicUsers = dynamicUsers;

  const minDelta = readInt(env.SIMULATION_FLUCTUATION_MIN);
  const maxDelta = readInt(env.SIMULATION_FLUCTUATION_MAX);
  if (minDelta !== undefined && maxDelta !== undefined) {
    SIMULATION_CONFIG.fluctuationRange = [minDelta, maxDelta];
  }

  const intervalMs = readInt(env.SIMULATION_FLUCTUATION_INTERVAL_MS);
  if (intervalMs !== undefined && intervalMs > 0) {
    SIMULATION_CONFIG.fluctuationIntervalMs = intervalMs;
  }
}
