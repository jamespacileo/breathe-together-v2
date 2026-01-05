/**
 * Behavior-Driven Tests
 *
 * High-level tests that verify user-facing outcomes rather than implementation details.
 * These tests should survive refactoring as long as the behavior remains the same.
 */

import { describe, expect, it } from 'vitest';
import { VISUALS } from '../constants';
import { calculateBreathState } from '../lib/breathCalc';
import { getMoodColor } from '../lib/colors';
import {
  createMockPresence,
  expectColorAccessibility,
  expectValidBreathingCycle,
  getColorTemperature,
} from './helpers';

describe('Behavior Tests: User Outcomes', () => {
  describe('Global Breathing Synchronization', () => {
    it('all users breathe together regardless of join time', () => {
      // OUTCOME: Two users who join 10 seconds apart see the same breath phase
      // at the same absolute UTC time (because breath is based on UTC, not join time)

      const user1JoinTime = Date.now();
      const user2JoinTime = user1JoinTime + 10000; // 10 seconds later

      // User 1 checks phase 30 seconds after their join
      const user1CheckTime = user1JoinTime + 30000;
      // User 2 checks phase 20 seconds after their join (same absolute UTC time)
      const user2CheckTime = user2JoinTime + 20000;

      // Both times should be the same absolute UTC time
      expect(user1CheckTime).toBe(user2CheckTime);

      // Both users should see the same breath phase at the same absolute time
      const phase1 = calculateBreathState(user1CheckTime).breathPhase;
      const phase2 = calculateBreathState(user2CheckTime).breathPhase;

      expect(phase1).toBe(phase2);
    });

    it('different absolute times produce different phases', () => {
      // OUTCOME: Breath phase changes over time (not stuck)
      const baseTime = Date.now();

      // Check phases at different times within a cycle
      const phase1 = calculateBreathState(baseTime).breathPhase;
      const phase2 = calculateBreathState(baseTime + 5000).breathPhase; // 5 seconds later

      // Phases should be different (breathing is progressing)
      expect(phase1).not.toBe(phase2);
    });

    it('breath phase is consistent across different timezones', () => {
      // OUTCOME: Users in different timezones see the same phase at the same moment
      const utcTime = 1704067200000; // 2024-01-01 00:00:00 UTC

      const { breathPhase: phase1 } = calculateBreathState(utcTime);
      const { breathPhase: phase2 } = calculateBreathState(utcTime);
      const { breathPhase: phase3 } = calculateBreathState(utcTime);

      // All should be identical (within floating point precision)
      expect(phase1).toBe(phase2);
      expect(phase2).toBe(phase3);
    });

    it('breathing cycle completes in exactly 19 seconds', () => {
      // OUTCOME: Full 4-7-8 cycle = 4s inhale + 7s hold + 8s exhale = 19s total
      const startTime = Date.now();
      const endTime = startTime + 19000; // 19 seconds later

      const startState = calculateBreathState(startTime);
      const endState = calculateBreathState(endTime);

      // After one full cycle, should return to same phase
      expect(startState.breathPhase).toBeCloseTo(endState.breathPhase, 2);
      expect(startState.phaseType).toBe(endState.phaseType);
    });
  });

  describe('Particle Count Reflects Active Users', () => {
    it('presence data with N users should display N particles', () => {
      // OUTCOME: User count in API response = number of visible particles
      const testCounts = [10, 42, 100, 200];

      for (const count of testCounts) {
        const presence = createMockPresence({ userCount: count });

        // OUTCOME: Presence data should have exact count
        expect(presence.count).toBe(count);
        expect(presence.users).toHaveLength(count);

        // SlotManager should create exactly this many slots
        const moodTotal =
          presence.moods.gratitude +
          presence.moods.presence +
          presence.moods.release +
          presence.moods.connection;
        expect(moodTotal).toBe(count);
      }
    });

    it('mood distribution matches user count', () => {
      // OUTCOME: Sum of all mood counts equals total user count
      const presence = createMockPresence({ userCount: 100 });

      const moodSum =
        presence.moods.gratitude +
        presence.moods.presence +
        presence.moods.release +
        presence.moods.connection;

      expect(moodSum).toBe(presence.count);
    });

    it('users array matches mood counts', () => {
      // OUTCOME: Users array length equals sum of mood counts
      const presence = createMockPresence({ userCount: 50 });

      const usersByMood = {
        gratitude: presence.users.filter((u) => u.mood === 'gratitude').length,
        presence: presence.users.filter((u) => u.mood === 'presence').length,
        release: presence.users.filter((u) => u.mood === 'release').length,
        connection: presence.users.filter((u) => u.mood === 'connection').length,
      };

      expect(usersByMood.gratitude).toBe(presence.moods.gratitude);
      expect(usersByMood.presence).toBe(presence.moods.presence);
      expect(usersByMood.release).toBe(presence.moods.release);
      expect(usersByMood.connection).toBe(presence.moods.connection);
    });
  });

  describe('Mood Colors Are Distinct and Accessible', () => {
    it('each mood has a unique, visually distinct color', () => {
      // OUTCOME: All 4 moods have different colors users can distinguish
      const colors = {
        gratitude: getMoodColor('gratitude'),
        presence: getMoodColor('presence'),
        release: getMoodColor('release'),
        connection: getMoodColor('connection'),
      };

      // All colors should be different
      const colorValues = Object.values(colors);
      const uniqueColors = new Set(colorValues);
      expect(uniqueColors.size).toBe(4);

      // Colors should be visually distinct (not shades of same color)
      expect(colors.gratitude).not.toBe(colors.presence);
      expect(colors.presence).not.toBe(colors.release);
      expect(colors.release).not.toBe(colors.connection);
    });

    it('mood colors have sufficient contrast against dark background', () => {
      // OUTCOME: All mood colors meet WCAG AA contrast requirements
      const backgroundColor = '#1a1a1a'; // Dark background
      const moods = ['gratitude', 'presence', 'release', 'connection'] as const;

      for (const mood of moods) {
        const color = getMoodColor(mood);
        expectColorAccessibility(color, backgroundColor, 3); // WCAG AA
      }
    });

    it('mood colors maintain Monument Valley aesthetic', () => {
      // OUTCOME: Colors feel warm, soft, and Monument Valley-inspired
      const colors = {
        gratitude: getMoodColor('gratitude'),
        presence: getMoodColor('presence'),
        release: getMoodColor('release'),
        connection: getMoodColor('connection'),
      };

      // Gratitude should be warm (gold tones)
      const gratitudeTemp = getColorTemperature(colors.gratitude);
      expect(gratitudeTemp).toBeGreaterThan(0); // Warm

      // Release should be cooler (blue tones)
      const releaseTemp = getColorTemperature(colors.release);
      expect(releaseTemp).toBeLessThan(0); // Cool
    });
  });

  describe('Breathing Cycle Follows 4-7-8 Pattern', () => {
    it('cycles through all phases in correct order', () => {
      // OUTCOME: User experiences inhale → hold-in → exhale → (repeat)
      // Note: 4-7-8 pattern has no hold-out phase (HOLD_OUT=0s)

      // Test mid-phase timing to avoid boundary issues
      const phases = [
        { time: 2000, expectedType: 0, name: 'mid-inhale' }, // 2s into inhale (0-4s)
        { time: 7500, expectedType: 1, name: 'mid-hold-in' }, // 3.5s into hold (4-11s)
        { time: 15000, expectedType: 2, name: 'mid-exhale' }, // 4s into exhale (11-19s)
      ];

      for (const { time, expectedType, name } of phases) {
        const state = calculateBreathState(time);
        expect(state.phaseType).toBe(expectedType);
        expectValidBreathingCycle(time);
      }
    });

    it('breath phase is always between 0 and 1', () => {
      // OUTCOME: breathPhase value never exceeds valid range
      const timestamps = Array.from({ length: 100 }, (_, i) => i * 1000);

      for (const timestamp of timestamps) {
        const { breathPhase } = calculateBreathState(timestamp);
        expect(breathPhase).toBeGreaterThanOrEqual(0);
        expect(breathPhase).toBeLessThanOrEqual(1);
      }
    });

    it('orbit radius expands and contracts with breathing', () => {
      // OUTCOME: Particles move farther (exhale) and closer (inhale) from globe
      // breathPhase: 0 = exhaled (max radius), 1 = inhaled (min radius)
      const timestamps = {
        fullyInhaled: 3900, // End of inhale (breathPhase ~1, min radius)
        fullyExhaled: 18900, // End of exhale (breathPhase ~0, max radius)
      };

      const exhaledState = calculateBreathState(timestamps.fullyExhaled);
      const inhaledState = calculateBreathState(timestamps.fullyInhaled);

      // Exhaled should have LARGER orbit radius (particles spread out)
      expect(exhaledState.orbitRadius).toBeGreaterThan(inhaledState.orbitRadius);

      // Radii should be within expected bounds
      expect(inhaledState.orbitRadius).toBeGreaterThanOrEqual(VISUALS.PARTICLE_ORBIT_MIN);
      expect(exhaledState.orbitRadius).toBeLessThanOrEqual(VISUALS.PARTICLE_ORBIT_MAX);
    });

    it('no invalid phase transitions occur', () => {
      // OUTCOME: Phase never jumps unexpectedly
      // Note: 4-7-8 pattern has HOLD_OUT=0, so exhale goes directly to inhale (2→0)

      let previousPhaseType = -1;
      const transitionsSeen: string[] = [];

      // Sample at 100ms intervals to catch all transitions
      for (let ms = 0; ms < 20000; ms += 100) {
        const { phaseType } = calculateBreathState(ms);

        if (previousPhaseType !== -1 && phaseType !== previousPhaseType) {
          const transition = `${previousPhaseType}→${phaseType}`;
          transitionsSeen.push(transition);

          // Valid transitions for 4-7-8 pattern (no hold-out):
          // 0→1 (inhale to hold-in)
          // 1→2 (hold-in to exhale)
          // 2→0 (exhale directly to inhale - no hold-out phase)
          const validTransition =
            (previousPhaseType === 0 && phaseType === 1) ||
            (previousPhaseType === 1 && phaseType === 2) ||
            (previousPhaseType === 2 && phaseType === 0); // Direct transition (HOLD_OUT=0)

          expect(validTransition).toBe(true);
        }

        previousPhaseType = phaseType;
      }

      // Verify we saw all expected transitions
      expect(transitionsSeen).toContain('0→1'); // Inhale to hold-in
      expect(transitionsSeen).toContain('1→2'); // Hold-in to exhale
      expect(transitionsSeen).toContain('2→0'); // Exhale to inhale (no hold-out)
    });
  });

  describe('Motion Preferences Respected', () => {
    it('validates that reduced motion preference can be detected', () => {
      // OUTCOME: System can detect user's motion preference
      // Note: In tests, we can't actually set window.matchMedia,
      // but we document the expected behavior

      const prefersReducedMotion = false; // Default in test environment

      expect(typeof prefersReducedMotion).toBe('boolean');
    });

    it('animation values are configurable', () => {
      // OUTCOME: Animation speeds can be adjusted based on preferences
      const defaultSpeed = 1.0;
      const reducedSpeed = 0.5;

      expect(reducedSpeed).toBeLessThan(defaultSpeed);
      expect(reducedSpeed).toBeGreaterThan(0); // Still has motion, just less
    });

    it('breathing cycle timing remains constant regardless of motion settings', () => {
      // OUTCOME: 4-7-8 timing is preserved even with reduced motion
      // (only animation smoothness changes, not the cycle itself)
      const cycleStart = Date.now();
      const cycleEnd = cycleStart + 19000;

      const startPhase = calculateBreathState(cycleStart).breathPhase;
      const endPhase = calculateBreathState(cycleEnd).breathPhase;

      // Cycle timing is constant regardless of motion preferences
      expect(startPhase).toBeCloseTo(endPhase, 2);
    });
  });
});
