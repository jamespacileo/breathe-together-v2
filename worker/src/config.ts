/**
 * Worker Configuration
 *
 * Centralized configuration for the presence API worker.
 * Modify this file to adjust behavior without changing implementation code.
 */

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
  // Set to true to enable simulated users for testing
  enabled: true,

  // Base number of NPCs always present (set to 0 for production)
  baseUserCount: 42,

  // Enable random arrivals/departures for realistic testing
  dynamicUsers: true,

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

// =============================================================================
// Presence Configuration
// =============================================================================

export interface PresenceConfig {
  /** Session TTL in milliseconds (default: 90 seconds) */
  sessionTtlMs: number;

  /** Probabilistic sample rate for KV mode (0.0 to 1.0) */
  sampleRate: number;

  /** Valid mood identifiers */
  validMoods: readonly MoodId[];
}

export const PRESENCE_CONFIG: PresenceConfig = {
  sessionTtlMs: 90_000,
  sampleRate: 0.03,
  validMoods: ['gratitude', 'presence', 'release', 'connection'] as const,
};

// =============================================================================
// API Configuration
// =============================================================================

export interface ApiConfig {
  /** Cache TTL for presence endpoint (seconds) */
  presenceCacheTtlSeconds: number;

  /** Cache TTL for config endpoint (seconds) */
  configCacheTtlSeconds: number;

  /** Heartbeat interval sent to clients (milliseconds) */
  heartbeatIntervalMs: number;

  /** API version number */
  version: number;
}

export const API_CONFIG: ApiConfig = {
  presenceCacheTtlSeconds: 10,
  configCacheTtlSeconds: 300,
  heartbeatIntervalMs: 30_000,
  version: 2,
};
