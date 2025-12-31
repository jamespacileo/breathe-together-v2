/**
 * Tests for presence calculation logic
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  addSample,
  calculateMoodRatios,
  countMoods,
  createInitialState,
  estimateCount,
  hashSession,
  PRESENCE_CONFIG,
  pruneStale,
  recalculate,
  toPresenceState,
  validateMood,
} from './presence';

describe('presence', () => {
  describe('createInitialState', () => {
    it('creates state with default ratios', () => {
      const now = 1700000000000;
      const state = createInitialState(now);

      expect(state.estimatedCount).toBe(0);
      expect(state.sampleCount).toBe(0);
      expect(state.lastUpdate).toBe(now);
      expect(state.samples).toEqual({});
      expect(state.moodRatios.gratitude).toBe(0.25);
      expect(state.moodRatios.presence).toBe(0.35);
      expect(state.moodRatios.release).toBe(0.25);
      expect(state.moodRatios.connection).toBe(0.15);
    });

    it('uses current time when no timestamp provided', () => {
      const before = Date.now();
      const state = createInitialState();
      const after = Date.now();

      expect(state.lastUpdate).toBeGreaterThanOrEqual(before);
      expect(state.lastUpdate).toBeLessThanOrEqual(after);
    });
  });

  describe('hashSession', () => {
    it('returns first 8 characters of session ID', () => {
      expect(hashSession('12345678-abcd-efgh')).toBe('12345678');
      expect(hashSession('abcdefghijklmnop')).toBe('abcdefgh');
    });

    it('throws for short session IDs', () => {
      expect(() => hashSession('short')).toThrow();
      expect(() => hashSession('')).toThrow();
    });
  });

  describe('validateMood', () => {
    it('returns valid moods unchanged', () => {
      expect(validateMood('gratitude')).toBe('gratitude');
      expect(validateMood('presence')).toBe('presence');
      expect(validateMood('release')).toBe('release');
      expect(validateMood('connection')).toBe('connection');
    });

    it('returns "presence" for invalid moods', () => {
      expect(validateMood('invalid')).toBe('presence');
      expect(validateMood(null)).toBe('presence');
      expect(validateMood(undefined)).toBe('presence');
      expect(validateMood(123)).toBe('presence');
    });
  });

  describe('pruneStale', () => {
    const NOW = 1700000000000;
    const TTL = 120000; // 2 minutes

    it('keeps fresh samples', () => {
      const samples = {
        abc: { mood: 'gratitude' as const, ts: NOW - 60000 }, // 1 min ago
        def: { mood: 'presence' as const, ts: NOW - 30000 }, // 30s ago
      };

      const result = pruneStale(samples, NOW, TTL);
      expect(Object.keys(result)).toHaveLength(2);
    });

    it('removes stale samples', () => {
      const samples = {
        abc: { mood: 'gratitude' as const, ts: NOW - 60000 }, // fresh
        def: { mood: 'presence' as const, ts: NOW - 180000 }, // 3 min ago (stale)
      };

      const result = pruneStale(samples, NOW, TTL);
      expect(Object.keys(result)).toHaveLength(1);
      expect(result.abc).toBeDefined();
      expect(result.def).toBeUndefined();
    });

    it('handles empty samples', () => {
      const result = pruneStale({}, NOW, TTL);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('countMoods', () => {
    it('counts moods correctly', () => {
      const samples = {
        a: { mood: 'gratitude' as const, ts: 0 },
        b: { mood: 'gratitude' as const, ts: 0 },
        c: { mood: 'presence' as const, ts: 0 },
        d: { mood: 'release' as const, ts: 0 },
      };

      const counts = countMoods(samples);
      expect(counts.gratitude).toBe(2);
      expect(counts.presence).toBe(1);
      expect(counts.release).toBe(1);
      expect(counts.connection).toBe(0);
    });

    it('returns zeros for empty samples', () => {
      const counts = countMoods({});
      expect(counts.gratitude).toBe(0);
      expect(counts.presence).toBe(0);
      expect(counts.release).toBe(0);
      expect(counts.connection).toBe(0);
    });
  });

  describe('calculateMoodRatios', () => {
    it('calculates ratios with smoothing', () => {
      const counts = { gratitude: 50, presence: 25, release: 15, connection: 10 };
      const previous = { gratitude: 0.25, presence: 0.35, release: 0.25, connection: 0.15 };
      const sampleCount = 100;

      const ratios = calculateMoodRatios(counts, previous, sampleCount, 0.7);

      // 0.7 * (50/100) + 0.3 * 0.25 = 0.35 + 0.075 = 0.425
      expect(ratios.gratitude).toBeCloseTo(0.425, 2);
      // 0.7 * (25/100) + 0.3 * 0.35 = 0.175 + 0.105 = 0.28
      expect(ratios.presence).toBeCloseTo(0.28, 2);
    });

    it('returns previous ratios for zero samples', () => {
      const counts = { gratitude: 0, presence: 0, release: 0, connection: 0 };
      const previous = { gratitude: 0.25, presence: 0.35, release: 0.25, connection: 0.15 };

      const ratios = calculateMoodRatios(counts, previous, 0);
      expect(ratios).toEqual(previous);
    });
  });

  describe('estimateCount', () => {
    it('extrapolates from sample rate', () => {
      // 30 samples at 3% rate = 1000 estimated
      const estimate = estimateCount(30, 0, 0, 0.03, 0.85);
      // 60% of raw estimate (1000) + 40% of previous (0) = 600
      expect(estimate).toBe(600);
    });

    it('smooths with previous estimate', () => {
      // 30 samples = 1000 raw, previous was 800
      const estimate = estimateCount(30, 800, 0, 0.03, 0.85);
      // 60% of 1000 + 40% of 800 = 600 + 320 = 920
      expect(estimate).toBe(920);
    });

    it('decays previous estimate over time', () => {
      // 0 samples, previous was 1000, 1 minute passed
      const estimate = estimateCount(0, 1000, 1, 0.03, 0.85);
      // 60% of 0 + 40% of (1000 * 0.85^1) = 0 + 340 = 340
      expect(estimate).toBe(340);
    });

    it('never returns negative', () => {
      const estimate = estimateCount(0, 0, 100, 0.03, 0.85);
      expect(estimate).toBe(0);
    });
  });

  describe('addSample', () => {
    let initialState: ReturnType<typeof createInitialState>;
    const NOW = 1700000000000;

    beforeEach(() => {
      initialState = createInitialState(NOW);
    });

    it('adds a new sample', () => {
      const sessionId = 'abcd1234-uuid-here';
      const result = addSample(initialState, sessionId, 'gratitude', NOW);
      const hash = sessionId.slice(0, 8); // 'abcd1234'
      expect(result.samples[hash]).toBeDefined();
      expect(result.samples[hash].mood).toBe('gratitude');
      expect(result.samples[hash].ts).toBe(NOW);
    });

    it('updates existing sample', () => {
      const sessionId = 'abcd1234-uuid-here';
      const hash = sessionId.slice(0, 8);
      const state1 = addSample(initialState, sessionId, 'gratitude', NOW);
      const state2 = addSample(state1, sessionId, 'release', NOW + 1000);

      expect(Object.keys(state2.samples)).toHaveLength(1);
      expect(state2.samples[hash].mood).toBe('release');
    });

    it('recalculates counts', () => {
      // Use different first 8 chars for each session
      const state1 = addSample(initialState, 'aaaaaaaa-uuid', 'gratitude', NOW);
      const state2 = addSample(state1, 'bbbbbbbb-uuid', 'presence', NOW);
      const state3 = addSample(state2, 'cccccccc-uuid', 'release', NOW);

      expect(state3.sampleCount).toBe(3);
      expect(state3.estimatedCount).toBeGreaterThan(0);
    });
  });

  describe('toPresenceState', () => {
    it('converts aggregate to presence state', () => {
      const state = {
        estimatedCount: 100,
        sampleCount: 3,
        moodRatios: { gratitude: 0.25, presence: 0.35, release: 0.25, connection: 0.15 },
        lastUpdate: 1700000000000,
        samples: {},
      };

      const presence = toPresenceState(state);

      expect(presence.count).toBe(100);
      expect(presence.moods.gratitude).toBe(25);
      expect(presence.moods.presence).toBe(35);
      expect(presence.moods.release).toBe(25);
      expect(presence.moods.connection).toBe(15);
      expect(presence.timestamp).toBe(1700000000000);
    });

    it('rounds mood counts', () => {
      const state = {
        estimatedCount: 33,
        sampleCount: 1,
        moodRatios: { gratitude: 0.333, presence: 0.333, release: 0.167, connection: 0.167 },
        lastUpdate: 0,
        samples: {},
      };

      const presence = toPresenceState(state);

      // All moods should be integers
      expect(Number.isInteger(presence.moods.gratitude)).toBe(true);
      expect(Number.isInteger(presence.moods.presence)).toBe(true);
      expect(Number.isInteger(presence.moods.release)).toBe(true);
      expect(Number.isInteger(presence.moods.connection)).toBe(true);
    });
  });

  describe('recalculate', () => {
    const NOW = 1700000000000;

    it('prunes stale samples during recalculation', () => {
      const state = {
        estimatedCount: 100,
        sampleCount: 2,
        moodRatios: { gratitude: 0.5, presence: 0.5, release: 0, connection: 0 },
        lastUpdate: NOW - 60000,
        samples: {
          fresh: { mood: 'gratitude' as const, ts: NOW - 30000 },
          stale: { mood: 'presence' as const, ts: NOW - 200000 }, // > 2 min
        },
      };

      const result = recalculate(state, NOW);

      expect(Object.keys(result.samples)).toHaveLength(1);
      expect(result.samples.fresh).toBeDefined();
      expect(result.samples.stale).toBeUndefined();
    });

    it('updates timestamp', () => {
      const state = createInitialState();
      state.lastUpdate = NOW - 60000;

      const result = recalculate(state, NOW);
      expect(result.lastUpdate).toBe(NOW);
    });
  });

  describe('integration', () => {
    it('simulates realistic usage', () => {
      const NOW = 1700000000000;
      let state = createInitialState(NOW);

      // Add 30 samples (simulating 3% of 1000 users)
      // Each session ID must have unique first 8 chars
      for (let i = 0; i < 30; i++) {
        const moods = ['gratitude', 'presence', 'release', 'connection'] as const;
        const mood = moods[i % 4];
        // Create unique 8-char prefix for each session
        const sessionId = `${i.toString(16).padStart(8, '0')}-uuid-test`;
        state = addSample(state, sessionId, mood, NOW);
      }

      const presence = toPresenceState(state);

      // Should estimate ~600 users (60% of 1000 raw estimate, no previous)
      expect(presence.count).toBeGreaterThan(0);
      expect(presence.count).toBeLessThan(1500);

      // All moods should have some count
      expect(presence.moods.gratitude).toBeGreaterThan(0);
      expect(presence.moods.presence).toBeGreaterThan(0);
      expect(presence.moods.release).toBeGreaterThan(0);
      expect(presence.moods.connection).toBeGreaterThan(0);
    });
  });
});
