/**
 * Presence Logic - Pure functions for presence calculations
 *
 * Extracted from the worker for testability.
 * All functions are pure and don't depend on Cloudflare APIs.
 */

import {
  getSimulatedCountryCounts,
  getSimulatedMoodCounts,
  getSimulatedUserCount,
  isSimulationEnabled,
  mergeWithSimulatedUsers,
} from './simulation';
import type { MoodId, PresenceState } from './types';

/**
 * Configuration for presence calculations
 */
export const PRESENCE_CONFIG = {
  /** Sample rate (3% = 1 in ~33 users report) */
  SAMPLE_RATE: 0.03,
  /** How long samples are valid (seconds) */
  SAMPLE_TTL_SECONDS: 120,
  /** Decay factor for smoothing (per minute) */
  DECAY_FACTOR: 0.85,
  /** Valid mood IDs */
  VALID_MOODS: ['gratitude', 'presence', 'release', 'connection'] as const,
} as const;

/**
 * Sample data stored for each user session
 */
export interface SampleData {
  mood: MoodId;
  ts: number;
  /** ISO 3166-1 alpha-2 country code (from Cloudflare geolocation) */
  country?: string;
}

/**
 * Stored aggregate state in KV
 */
export interface AggregateState {
  estimatedCount: number;
  sampleCount: number;
  moodRatios: Record<MoodId, number>;
  lastUpdate: number;
  samples: Record<string, SampleData>;
}

/**
 * Create initial empty aggregate state
 */
export function createInitialState(now: number = Date.now()): AggregateState {
  return {
    estimatedCount: 0,
    sampleCount: 0,
    moodRatios: { gratitude: 0.25, presence: 0.35, release: 0.25, connection: 0.15 },
    lastUpdate: now,
    samples: {},
  };
}

/**
 * Hash session ID to a short slot key
 * Reduces storage by grouping similar sessions
 */
export function hashSession(sessionId: string): string {
  if (!sessionId || sessionId.length < 8) {
    throw new Error('Session ID must be at least 8 characters');
  }
  return sessionId.slice(0, 8);
}

/**
 * Validate mood ID
 */
export function validateMood(mood: unknown): MoodId {
  if (typeof mood === 'string' && PRESENCE_CONFIG.VALID_MOODS.includes(mood as MoodId)) {
    return mood as MoodId;
  }
  return 'presence';
}

/**
 * Prune stale samples from state
 */
export function pruneStale(
  samples: Record<string, SampleData>,
  now: number,
  ttlMs: number = PRESENCE_CONFIG.SAMPLE_TTL_SECONDS * 1000,
): Record<string, SampleData> {
  const cutoff = now - ttlMs;
  const result: Record<string, SampleData> = {};

  for (const [slot, sample] of Object.entries(samples)) {
    if (sample.ts > cutoff) {
      result[slot] = sample;
    }
  }

  return result;
}

/**
 * Count moods in samples
 */
export function countMoods(samples: Record<string, SampleData>): Record<MoodId, number> {
  const counts: Record<MoodId, number> = {
    gratitude: 0,
    presence: 0,
    release: 0,
    connection: 0,
  };

  for (const sample of Object.values(samples)) {
    counts[sample.mood]++;
  }

  return counts;
}

/**
 * Count users per country from samples
 */
export function countCountries(samples: Record<string, SampleData>): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const sample of Object.values(samples)) {
    if (sample.country) {
      counts[sample.country] = (counts[sample.country] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Calculate smoothed mood ratios
 */
export function calculateMoodRatios(
  moodCounts: Record<MoodId, number>,
  previousRatios: Record<MoodId, number>,
  sampleCount: number,
  smoothingFactor: number = 0.7,
): Record<MoodId, number> {
  if (sampleCount === 0) {
    return { ...previousRatios };
  }

  const result: Record<MoodId, number> = { ...previousRatios };

  for (const mood of PRESENCE_CONFIG.VALID_MOODS) {
    const newRatio = moodCounts[mood] / sampleCount;
    result[mood] = newRatio * smoothingFactor + previousRatios[mood] * (1 - smoothingFactor);
  }

  return result;
}

/**
 * Estimate total user count from samples
 */
export function estimateCount(
  sampleCount: number,
  previousEstimate: number,
  timeSinceUpdateMinutes: number,
  sampleRate: number = PRESENCE_CONFIG.SAMPLE_RATE,
  decayFactor: number = PRESENCE_CONFIG.DECAY_FACTOR,
): number {
  const rawEstimate = sampleCount / sampleRate;
  const decayedPrevious = previousEstimate * decayFactor ** timeSinceUpdateMinutes;

  // 60% new estimate, 40% decayed previous (for smoothing)
  return Math.max(0, Math.round(rawEstimate * 0.6 + decayedPrevious * 0.4));
}

/**
 * Recalculate aggregate state with new data
 */
export function recalculate(state: AggregateState, now: number): AggregateState {
  const activeSamples = pruneStale(state.samples, now);
  const sampleCount = Object.keys(activeSamples).length;
  const moodCounts = countMoods(activeSamples);
  const moodRatios = calculateMoodRatios(moodCounts, state.moodRatios, sampleCount);
  const timeSinceUpdate = (now - state.lastUpdate) / 60000;
  const estimatedCount = estimateCount(sampleCount, state.estimatedCount, timeSinceUpdate);

  return {
    estimatedCount,
    sampleCount,
    moodRatios,
    lastUpdate: now,
    samples: activeSamples,
  };
}

/**
 * Add or update a sample in state
 */
export function addSample(
  state: AggregateState,
  sessionId: string,
  mood: MoodId,
  now: number,
  country?: string,
): AggregateState {
  const slot = hashSession(sessionId);
  const sampleData: SampleData = { mood, ts: now };
  if (country) {
    sampleData.country = country;
  }
  const newSamples = { ...state.samples, [slot]: sampleData };

  return recalculate({ ...state, samples: newSamples }, now);
}

/**
 * Convert aggregate state to public presence response
 * Includes users array for synchronized slot-based rendering
 * Merges with simulated users when simulation is enabled
 */
export function toPresenceState(state: AggregateState): PresenceState {
  // Convert real samples to users array (including country)
  const realUsers = Object.entries(state.samples)
    .map(([id, sample]) => ({
      id,
      mood: sample.mood,
      ...(sample.country ? { country: sample.country } : {}),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  // Merge with simulated users if enabled
  const users = mergeWithSimulatedUsers(realUsers);

  // Calculate total count (real + simulated)
  const simulatedCount = isSimulationEnabled() ? getSimulatedUserCount() : 0;
  const count = state.estimatedCount + simulatedCount;

  // Get simulated mood counts
  const simMoods = getSimulatedMoodCounts();

  // Count users per country (merge real + simulated)
  const realCountryCounts = countCountries(state.samples);
  const simCountryCounts = isSimulationEnabled() ? getSimulatedCountryCounts() : {};

  // Merge country counts
  const countryCounts: Record<string, number> = { ...realCountryCounts };
  for (const [country, count] of Object.entries(simCountryCounts)) {
    countryCounts[country] = (countryCounts[country] || 0) + count;
  }

  return {
    count,
    moods: {
      gratitude: Math.round(state.estimatedCount * state.moodRatios.gratitude) + simMoods.gratitude,
      presence: Math.round(state.estimatedCount * state.moodRatios.presence) + simMoods.presence,
      release: Math.round(state.estimatedCount * state.moodRatios.release) + simMoods.release,
      connection:
        Math.round(state.estimatedCount * state.moodRatios.connection) + simMoods.connection,
    },
    users,
    countryCounts,
    timestamp: state.lastUpdate,
  };
}
