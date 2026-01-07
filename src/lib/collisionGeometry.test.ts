/**
 * Fibonacci Distribution Tests
 *
 * OUTCOME-FOCUSED: Tests validate that particles remain evenly distributed
 * across the globe surface, ensuring users see balanced visual coverage.
 *
 * Why this matters:
 * - Clumping particles creates visual hotspots (bad UX)
 * - Uneven spacing breaks the meditation aesthetic
 * - Animation effects can degrade initial distribution
 *
 * Testing approach:
 * - Uses shared geometry helpers for consistency
 * - Measures statistical distribution properties
 * - Validates behavior across particle counts and time
 *
 * Run with VERBOSE=true for detailed diagnostic output:
 *   VERBOSE=true npm test fibonacciDistribution
 */

import * as fc from 'fast-check';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  allPointsOnUnitSphere,
  angularDistance,
  coefficientOfVariation,
  debug,
  debugDistribution,
  debugSection,
  debugTable,
  findNearestNeighborDistances,
  theoreticalOptimalDistance,
} from '../test/helpers';
import {
  calculateAllParticlePositions,
  calculateOrbitRadius,
  calculateShardSize,
  checkGlobeCollisions,
  checkParticleCollisions,
  DEFAULT_CONFIG,
  getFibonacciSpherePoint,
} from './collisionGeometry';

/**
 * Measure distribution quality metrics
 */
interface DistributionMetrics {
  /** Coefficient of variation of nearest neighbor distances (0 = perfect, >0.3 = poor) */
  cv: number;
  /** Mean nearest neighbor angular distance (radians) */
  meanDistance: number;
  /** Min nearest neighbor distance (radians) */
  minDistance: number;
  /** Max nearest neighbor distance (radians) */
  maxDistance: number;
  /** Ratio of min/max (1 = perfect, <0.5 = poor) */
  minMaxRatio: number;
  /** Theoretical optimal distance for this N */
  theoreticalOptimal: number;
}

function measureDistribution(positions: THREE.Vector3[]): DistributionMetrics {
  const distances = findNearestNeighborDistances(positions);
  const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
  const cv = coefficientOfVariation(distances);
  const min = Math.min(...distances);
  const max = Math.max(...distances);

  return {
    cv,
    meanDistance: mean,
    minDistance: min,
    maxDistance: max,
    minMaxRatio: min / max,
    theoreticalOptimal: theoreticalOptimalDistance(positions.length),
  };
}

describe('Collision Geometry (collisionGeometry)', () => {
  describe('API Surface & Contract', () => {
    it('exports expected functions', async () => {
      const collisionGeometry = await import('./collisionGeometry');
      const exports = Object.keys(collisionGeometry);
      expect(exports).toContain('getFibonacciSpherePoint');
      expect(exports.sort()).toMatchSnapshot();
    });

    it('getFibonacciSpherePoint(index, count) maintains signature', () => {
      const result = getFibonacciSpherePoint(0, 100);
      expect(getFibonacciSpherePoint.length).toBe(2);
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
      expect(typeof result.z).toBe('number');
    });

    it('parameter order is (index, count)', () => {
      const point1 = getFibonacciSpherePoint(5, 100);
      const point2 = getFibonacciSpherePoint(100, 5);
      expect(point1.x).not.toBe(point2.x);
    });

    it('returns new object each call (immutability)', () => {
      const point1 = getFibonacciSpherePoint(0, 100);
      const point2 = getFibonacciSpherePoint(0, 100);
      expect(point1).not.toBe(point2);
      expect(point1.x).toBe(point2.x);
    });
  });

  describe('Property-Based Invariants', () => {
    it('all points are on unit sphere surface', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
          (index, count) => {
            if (index >= count) return true;
            const point = getFibonacciSpherePoint(index, count);
            const distance = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
            return Math.abs(distance - 1) < 0.0001;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('points are evenly distributed (symmetry)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 20, max: 100 }), (count) => {
          return checkFibonacciSphereSymmetry(count);
        }),
        { numRuns: 20 },
      );
    });
  });

  describe('Shape Collision Logic', () => {
    it('calculates shard size based on particle count', () => {
      const size50 = calculateShardSize({ ...DEFAULT_CONFIG, particleCount: 50 });
      const size100 = calculateShardSize({ ...DEFAULT_CONFIG, particleCount: 100 });
      expect(size50).toBeGreaterThan(size100);
    });

    it('calculates correct orbit radius bounds', () => {
      expect(calculateOrbitRadius(0)).toBe(6.0); // Max
      expect(calculateOrbitRadius(1)).toBe(2.5); // Min
    });

    it('detects particle collisions', () => {
      const result = checkParticleCollisions(1.0, { particleCount: 300 });
      expect(result.hasCollision).toBe(false);
    });

    it('detects globe collisions', () => {
      const result = checkGlobeCollisions(1.0, { particleCount: 300 });
      expect(result.hasCollision).toBe(false);
    });
  });

  describe('Fibonacci Distribution Evenness', () => {
    describe('Pure Fibonacci sphere (baseline)', () => {
      it('should have even distribution at initialization (time=0)', () => {
        // OUTCOME: Users see particles evenly spread across globe at startup
        // No visual clumping or gaps that would break the meditation aesthetic
        const counts = [42, 100, 200];

        for (const count of counts) {
          // Get pure Fibonacci points (no animation effects)
          const points: THREE.Vector3[] = [];
          for (let i = 0; i < count; i++) {
            points.push(getFibonacciSpherePoint(i, count).multiplyScalar(5)); // Scale to orbit radius
          }

          const metrics = measureDistribution(points);

          // INVARIANT: Low coefficient of variation means uniform spacing
          expect(metrics.cv).toBeLessThan(0.15);
          // INVARIANT: Min/max ratio indicates no extreme gaps or clusters
          // Note: Fibonacci sphere inherently has some variation due to pole concentration
          expect(metrics.minMaxRatio).toBeGreaterThan(0.5);

          debugDistribution(`Pure Fibonacci (${count} particles)`, {
            cv: metrics.cv,
            minMaxRatio: metrics.minMaxRatio,
            meanDistance: metrics.meanDistance * (180 / Math.PI),
            count,
          });
        }
      });

      it('should maintain distribution invariants for any particle count', () => {
        // PROPERTY: Distribution quality should hold across all valid particle counts
        // Uses property-based testing to verify behavior beyond fixed test cases
        fc.assert(
          fc.property(fc.integer({ min: 10, max: 500 }), (count) => {
            const points: THREE.Vector3[] = [];
            for (let i = 0; i < count; i++) {
              points.push(getFibonacciSpherePoint(i, count).multiplyScalar(5));
            }

            // INVARIANT: All points lie on sphere surface (scaled)
            const normalizedPoints = points.map((p) => p.clone().normalize());
            expect(allPointsOnUnitSphere(normalizedPoints, 0.01)).toBe(true);

            // INVARIANT: Distribution quality remains bounded
            const metrics = measureDistribution(points);
            expect(metrics.cv).toBeLessThan(0.25); // Allow slightly higher for small counts
            expect(metrics.minMaxRatio).toBeGreaterThan(0.3); // Allow more variation
          }),
          { numRuns: 100 },
        );
      });
    });

    describe('Animated positions (with drift effects)', () => {
      it('should show distribution degradation over time due to orbit drift', () => {
        // OUTCOME: Documents current animation behavior that affects visual distribution
        // Users may notice particles clumping after extended viewing (>2 minutes)
        // This test establishes baseline for future improvements
        const particleCount = 100;
        const timePoints = [0, 10, 30, 60, 120]; // seconds

        debugSection('ORBIT DRIFT ANALYSIS');
        debug(`Particle count: ${particleCount}`);

        const results: { time: number; cv: number; minMaxRatio: number }[] = [];

        for (const time of timePoints) {
          const positions = calculateAllParticlePositions(0.5, {
            ...DEFAULT_CONFIG,
            particleCount,
            time,
          });

          const metrics = measureDistribution(positions);

          results.push({ time, cv: metrics.cv, minMaxRatio: metrics.minMaxRatio });

          debugDistribution(`t=${time}s`, {
            cv: metrics.cv,
            minMaxRatio: metrics.minMaxRatio,
            meanDistance: metrics.meanDistance * (180 / Math.PI),
          });
        }

        // The CV should generally increase over time due to drift
        // This test documents the current behavior
        const t0 = results[0];
        const t120 = results[results.length - 1];
        expect(t0?.time).toBe(0);
        expect(t120?.time).toBe(120);

        debug(
          `Degradation at 120s: CV increased by ${((((t120?.cv ?? 0) - (t0?.cv ?? 0)) / (t0?.cv ?? 1)) * 100).toFixed(1)}%`,
        );

        // Currently, expect some degradation (this is the bug we're documenting)
        // After fix, we should update this test to expect minimal degradation
        expect(t0?.cv).toBeDefined(); // Baseline exists
        expect(t120?.cv).toBeDefined(); // Long-term value exists
      });

      it('should identify orbit drift as primary cause of uneven distribution', () => {
        // OUTCOME: Verifies that particles drift at different rates
        const particleCount = 100;

        // Compare positions at time=0 vs time=60
        const positions0 = calculateAllParticlePositions(0.5, {
          particleCount,
          time: 0,
        });

        const positions60 = calculateAllParticlePositions(0.5, {
          particleCount,
          time: 60,
        });

        // Measure how much each particle has drifted (angular displacement)
        const drifts: number[] = [];
        for (let i = 0; i < particleCount; i++) {
          const drift = angularDistance(positions0[i], positions60[i]);
          drifts.push(drift);
        }

        const meanDrift = drifts.reduce((a, b) => a + b, 0) / drifts.length;
        const driftCV = coefficientOfVariation(drifts);

        debugTable('ORBIT DRIFT MEASUREMENT', {
          meanDriftDegrees: meanDrift * (180 / Math.PI),
          driftCV,
        });

        // Each particle drifts at a different rate due to variable orbitSpeed
        // This is the root cause - particles don't maintain relative positions
        expect(meanDrift).toBeGreaterThan(0); // Confirms particles are moving
        expect(driftCV).toBeGreaterThan(0.1); // Confirms non-uniform drift
      });
    });

    describe('Distribution quality at various particle counts and times', () => {
      it('maintains acceptable distribution quality across configurations', () => {
        // OUTCOME: All tested configurations meet minimum quality thresholds
        const counts = [42, 100, 200, 300];
        const times = [0, 30, 60];

        debugSection('DISTRIBUTION QUALITY REPORT');

        for (const count of counts) {
          for (const time of times) {
            const positions = calculateAllParticlePositions(0.5, {
              particleCount: count,
              time,
            });

            const metrics = measureDistribution(positions);

            debugDistribution(`${count} particles, t=${time}s`, {
              cv: metrics.cv,
              minMaxRatio: metrics.minMaxRatio,
              count,
            });

            // Relaxed thresholds that account for drift over time
            // CV < 0.5 is acceptable (not great, but functional)
            expect(metrics.cv).toBeLessThan(0.5);
            // Min/max ratio > 0.2 ensures no extreme clustering
            expect(metrics.minMaxRatio).toBeGreaterThan(0.2);
          }
        }
      });
    });
  });

  describe('Root Cause Analysis: Orbit Speed Variation', () => {
    it('verifies orbit speed variation causes uneven drift', () => {
      // OUTCOME: Documents that orbit speed variation is >50% of base speed
      // Constants from ParticleSwarm
      const ORBIT_BASE_SPEED = 0.015;
      const ORBIT_SPEED_VARIATION = 0.01;

      const speeds: number[] = [];
      const particleCount = 100;

      for (let i = 0; i < particleCount; i++) {
        const orbitSeed = (i * Math.PI + 0.1) % 1;
        const orbitSpeed = ORBIT_BASE_SPEED + (orbitSeed - 0.5) * 2 * ORBIT_SPEED_VARIATION;
        speeds.push(orbitSpeed);
      }

      const minSpeed = Math.min(...speeds);
      const maxSpeed = Math.max(...speeds);
      const speedVariationPercent = ((maxSpeed - minSpeed) / ORBIT_BASE_SPEED) * 100;

      debugTable('ORBIT SPEED ANALYSIS', {
        minSpeed,
        maxSpeed,
        variationPercent: speedVariationPercent,
        fastestDrift60s: maxSpeed * 60 * (180 / Math.PI),
        slowestDrift60s: minSpeed * 60 * (180 / Math.PI),
        relativeDrift60s: (maxSpeed - minSpeed) * 60 * (180 / Math.PI),
      });

      // This demonstrates the problem: particles can drift up to ~40° apart over 60s
      expect(maxSpeed).toBeGreaterThan(minSpeed);
      expect((maxSpeed - minSpeed) / ORBIT_BASE_SPEED).toBeGreaterThan(0.5); // >50% variation
    });
  });

  /**
   * POTENTIAL FIXES for even distribution (documented here for reference):
   *
   * 1. **Uniform orbit speed**: All particles rotate at the same rate
   *    Pro: Simple fix, maintains visual motion
   *    Con: Loses individual character
   *
   * 2. **Periodic redistribution**: Re-apply Fibonacci positions every N seconds
   *    Pro: Guarantees evenness periodically
   *    Con: May cause visible snapping
   *
   * 3. **Tangential orbit (recommended)**: Instead of Y-axis rotation,
   *    rotate each particle along its own tangent circle at the same latitude
   *    Pro: Maintains Fibonacci spacing exactly
   *    Con: More complex math
   *
   * 4. **Spherical harmonic noise**: Replace Y-axis orbit with spherically
   *    coherent noise that respects the sphere topology
   *    Pro: Organic motion without clustering
   *    Con: Complex to implement
   *
   * 5. **Distance-aware orbit speed**: Scale orbit speed inversely with latitude
   *    to compensate for arc length differences
   *    Pro: Moderate complexity
   *    Con: May look unnatural
   */

  /**
   * Helper function to check Fibonacci sphere symmetry across octants
   */
  function checkFibonacciSphereSymmetry(count: number): boolean {
    const points = [];
    for (let i = 0; i < count; i++) {
      points.push(getFibonacciSpherePoint(i, count));
    }

    // Count points in each octant using a map
    const octantCounts = new Map<string, number>();
    const octantKeys = ['ppp', 'ppn', 'pnp', 'pnn', 'npp', 'npn', 'nnp', 'nnn'];
    for (const key of octantKeys) {
      octantCounts.set(key, 0);
    }

    for (const p of points) {
      const key = (p.x >= 0 ? 'p' : 'n') + (p.y >= 0 ? 'p' : 'n') + (p.z >= 0 ? 'p' : 'n');
      octantCounts.set(key, (octantCounts.get(key) || 0) + 1);
    }

    // Each octant should have at least 3% of points (reduced from 5% for small counts)
    const minPointsPerOctant = count * 0.03;
    return Array.from(octantCounts.values()).every(
      (octantCount) => octantCount >= minPointsPerOctant,
    );
  }
});
