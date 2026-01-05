/**
 * Function Signature Contract Tests
 *
 * Validates that critical functions maintain their parameter order and types.
 * Protects against refactoring that accidentally changes function signatures.
 */

import { describe, expect, it } from 'vitest';
import { calculateBreathState } from '../lib/breathCalc';
import { getFibonacciSpherePoint } from '../lib/collisionGeometry';
import { getMonumentValleyMoodColor } from '../lib/colors';
import { createMockBreathPhase, createMockPresence, createMockUsers } from './helpers';

describe('Function Signature Contract Tests', () => {
  describe('Core Library Functions', () => {
    it('calculateBreathState(timestamp) maintains signature', () => {
      // CONTRACT: Single number parameter, returns object with specific properties
      const timestamp = Date.now();
      const result = calculateBreathState(timestamp);

      // Verify function accepts single parameter
      expect(calculateBreathState.length).toBe(1);

      // Verify return type structure
      expect(result).toHaveProperty('breathPhase');
      expect(result).toHaveProperty('phaseType');
      expect(result).toHaveProperty('orbitRadius');
      expect(result).toHaveProperty('rawProgress');

      // Verify property types
      expect(typeof result.breathPhase).toBe('number');
      expect(typeof result.phaseType).toBe('number');
      expect(typeof result.orbitRadius).toBe('number');
      expect(typeof result.rawProgress).toBe('number');
    });

    it('getMonumentValleyMoodColor(moodId) maintains signature', () => {
      // CONTRACT: Single string parameter, returns hex color string
      const moodId = 'gratitude';
      const result = getMonumentValleyMoodColor(moodId);

      // Verify function accepts single parameter
      expect(getMonumentValleyMoodColor.length).toBe(1);

      // Verify return type
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('getFibonacciSpherePoint(index, count) maintains signature', () => {
      // CONTRACT: Two number parameters, returns object with x, y, z
      const result = getFibonacciSpherePoint(0, 100);

      // Verify function accepts two parameters
      expect(getFibonacciSpherePoint.length).toBe(2);

      // Verify return type structure
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(result).toHaveProperty('z');

      // Verify property types
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
      expect(typeof result.z).toBe('number');
    });
  });

  describe('Test Helper Functions', () => {
    it('createMockUsers(count, mood?) maintains signature', () => {
      // CONTRACT: count required, mood optional, returns array of users
      const result = createMockUsers(10);

      // Verify returns array
      expect(Array.isArray(result)).toBe(true);

      // Verify array element structure
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('mood');
      }

      // Verify optional parameter works
      const withMood = createMockUsers(5, 'gratitude');
      expect(withMood.every((u) => u.mood === 'gratitude')).toBe(true);
    });

    it('createMockPresence(config) maintains signature', () => {
      // CONTRACT: Single config object parameter, returns PresenceState
      const result = createMockPresence({});

      // Verify function accepts single parameter
      expect(createMockPresence.length).toBe(1);

      // Verify return type structure
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('moods');
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('countryCounts');
      expect(result).toHaveProperty('timestamp');

      // Verify property types
      expect(typeof result.count).toBe('number');
      expect(typeof result.moods).toBe('object');
      expect(Array.isArray(result.users)).toBe(true);
    });

    it('createMockBreathPhase(phase) maintains signature', () => {
      // CONTRACT: Single number parameter, returns breath phase object
      const result = createMockBreathPhase(0.5);

      // Verify function accepts single parameter
      expect(createMockBreathPhase.length).toBe(1);

      // Verify return type structure
      expect(result).toHaveProperty('breathPhase');
      expect(result).toHaveProperty('phaseType');
      expect(result).toHaveProperty('rawProgress');
      expect(result).toHaveProperty('orbitRadius');
    });
  });

  describe('Parameter Order Validation', () => {
    it('getFibonacciSpherePoint parameter order is (index, count)', () => {
      // CONTRACT: index comes before count
      // If order is swapped, distribution breaks (index > count)
      const point1 = getFibonacciSpherePoint(5, 100);
      const point2 = getFibonacciSpherePoint(100, 5);

      // Correct order produces valid point
      const distance1 = Math.sqrt(point1.x ** 2 + point1.y ** 2 + point1.z ** 2);
      expect(distance1).toBeCloseTo(1, 3);

      // Wrong order produces different point (index 100 of 5 is out of bounds)
      // This catches if parameters are accidentally swapped
      expect(point1.x).not.toBe(point2.x);
    });

    it('createMockUsers parameter order is (count, mood)', () => {
      // CONTRACT: count comes before mood
      const users = createMockUsers(10, 'gratitude');

      expect(users).toHaveLength(10);
      expect(users.every((u) => u.mood === 'gratitude')).toBe(true);
    });
  });

  describe('Return Value Immutability', () => {
    it('calculateBreathState returns new object each call', () => {
      // CONTRACT: Pure function, doesn't return cached object
      const timestamp = Date.now();
      const result1 = calculateBreathState(timestamp);
      const result2 = calculateBreathState(timestamp);

      // Values should match
      expect(result1.breathPhase).toBe(result2.breathPhase);

      // But should be different object instances (not cached)
      expect(result1).not.toBe(result2);
    });

    it('getFibonacciSpherePoint returns new object each call', () => {
      // CONTRACT: Pure function, returns new point object
      const point1 = getFibonacciSpherePoint(0, 100);
      const point2 = getFibonacciSpherePoint(0, 100);

      // Values should match
      expect(point1.x).toBe(point2.x);
      expect(point1.y).toBe(point2.y);
      expect(point1.z).toBe(point2.z);

      // But should be different object instances
      expect(point1).not.toBe(point2);
    });
  });

  describe('Error Handling Contracts', () => {
    it('calculateBreathState handles invalid timestamps gracefully', () => {
      // CONTRACT: Should not throw on invalid input
      expect(() => calculateBreathState(NaN)).not.toThrow();
      expect(() => calculateBreathState(-1)).not.toThrow();
      expect(() => calculateBreathState(Number.POSITIVE_INFINITY)).not.toThrow();
    });

    it('getFibonacciSpherePoint handles invalid index gracefully', () => {
      // CONTRACT: Should not throw on out-of-bounds index
      expect(() => getFibonacciSpherePoint(-1, 100)).not.toThrow();
      expect(() => getFibonacciSpherePoint(100, 100)).not.toThrow();
      expect(() => getFibonacciSpherePoint(0, 0)).not.toThrow();
    });

    it('getMonumentValleyMoodColor handles unknown mood gracefully', () => {
      // CONTRACT: Should return fallback color, not throw
      // biome-ignore lint/suspicious/noExplicitAny: Testing error handling with invalid input
      expect(() => getMonumentValleyMoodColor('unknown' as any)).not.toThrow();
    });
  });

  describe('Numeric Precision Contracts', () => {
    it('calculateBreathState breathPhase always normalized to [0,1]', () => {
      // CONTRACT: breathPhase never exceeds bounds
      const timestamps = [0, 1000, 10000, 100000, Date.now()];

      for (const ts of timestamps) {
        const result = calculateBreathState(ts);
        expect(result.breathPhase).toBeGreaterThanOrEqual(0);
        expect(result.breathPhase).toBeLessThanOrEqual(1);
      }
    });

    it('getFibonacciSpherePoint always returns unit sphere points', () => {
      // CONTRACT: Distance from origin is always 1
      const counts = [1, 10, 100, 500];

      for (const count of counts) {
        for (let i = 0; i < Math.min(count, 10); i++) {
          const point = getFibonacciSpherePoint(i, count);
          const distance = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
          expect(distance).toBeCloseTo(1, 4);
        }
      }
    });
  });

  describe('Type Safety Contracts', () => {
    it('calculateBreathState return values are finite numbers', () => {
      // CONTRACT: No NaN or Infinity in results
      const result = calculateBreathState(Date.now());

      expect(Number.isFinite(result.breathPhase)).toBe(true);
      expect(Number.isFinite(result.phaseType)).toBe(true);
      expect(Number.isFinite(result.orbitRadius)).toBe(true);
      expect(Number.isFinite(result.rawProgress)).toBe(true);
    });

    it('getMonumentValleyMoodColor always returns valid hex', () => {
      // CONTRACT: Return value is always valid hex color
      const moods = ['gratitude', 'presence', 'release', 'connection'] as const;

      for (const mood of moods) {
        const color = getMonumentValleyMoodColor(mood);
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(color.length).toBe(7);
      }
    });
  });

  describe('Performance Contracts', () => {
    it('calculateBreathState executes in <1ms', () => {
      // CONTRACT: Breath calculation is fast enough for 60fps
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        calculateBreathState(Date.now() + i);
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(1); // <1ms per call
    });

    it('getFibonacciSpherePoint executes in <1ms', () => {
      // CONTRACT: Point calculation is fast enough for particle systems
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        getFibonacciSpherePoint(i % 500, 500);
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      expect(avgTime).toBeLessThan(1); // <1ms per call
    });
  });
});
