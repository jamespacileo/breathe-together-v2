/**
 * Presence Logic - Pure functions for presence calculations
 *
 * Extracted from the worker for testability.
 * All functions are pure and don't depend on Cloudflare APIs.
 */

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
 * Stored aggregate state in KV
 */
export interface AggregateState {
  estimatedCount: number;
  sampleCount: number;
  moodRatios: Record<MoodId, number>;
  lastUpdate: number;
  samples: Record<string, { mood: MoodId; ts: number }>;
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
  samples: Record<string, { mood: MoodId; ts: number }>,
  now: number,
  ttlMs: number = PRESENCE_CONFIG.SAMPLE_TTL_SECONDS * 1000,
): Record<string, { mood: MoodId; ts: number }> {
  const cutoff = now - ttlMs;
  const result: Record<string, { mood: MoodId; ts: number }> = {};

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
export function countMoods(
  samples: Record<string, { mood: MoodId; ts: number }>,
): Record<MoodId, number> {
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
): AggregateState {
  const slot = hashSession(sessionId);
  const newSamples = { ...state.samples, [slot]: { mood, ts: now } };

  return recalculate({ ...state, samples: newSamples }, now);
}

/**
 * Convert aggregate state to public presence response
 */
export function toPresenceState(state: AggregateState): PresenceState {
  const count = state.estimatedCount;

  return {
    count,
    moods: {
      gratitude: Math.round(count * state.moodRatios.gratitude),
      presence: Math.round(count * state.moodRatios.presence),
      release: Math.round(count * state.moodRatios.release),
      connection: Math.round(count * state.moodRatios.connection),
    },
    timestamp: state.lastUpdate,
  };
}
