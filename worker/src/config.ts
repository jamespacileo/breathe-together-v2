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

  /** Country distribution for simulated users (ISO 3166-1 alpha-2 codes, must sum to 1.0) */
  countryDistribution: Record<string, number>;
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

  // Country distribution (realistic global meditation community)
  countryDistribution: {
    US: 0.25, // United States
    GB: 0.1, // United Kingdom
    DE: 0.08, // Germany
    FR: 0.06, // France
    JP: 0.06, // Japan
    AU: 0.05, // Australia
    CA: 0.05, // Canada
    BR: 0.04, // Brazil
    IN: 0.04, // India
    NL: 0.03, // Netherlands
    ES: 0.03, // Spain
    IT: 0.03, // Italy
    SE: 0.02, // Sweden
    MX: 0.02, // Mexico
    KR: 0.02, // South Korea
    PL: 0.02, // Poland
    AR: 0.02, // Argentina
    NZ: 0.02, // New Zealand
    CH: 0.02, // Switzerland
    BE: 0.02, // Belgium
    // Remaining 2% distributed across other countries
    PT: 0.01, // Portugal
    ZA: 0.01, // South Africa
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
