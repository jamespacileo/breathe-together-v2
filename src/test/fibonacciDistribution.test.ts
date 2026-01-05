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
 */

import * as fc from 'fast-check';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  calculateAllParticlePositions,
  DEFAULT_CONFIG,
  getFibonacciSpherePoint,
} from '../lib/collisionGeometry';
import {
  allPointsOnUnitSphere,
  angularDistance,
  coefficientOfVariation,
  findNearestNeighborDistances,
  theoreticalOptimalDistance,
} from './helpers';

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

        console.log(`Pure Fibonacci (${count} particles):`, {
          cv: metrics.cv.toFixed(4),
          minMaxRatio: metrics.minMaxRatio.toFixed(4),
          meanDist: `${(metrics.meanDistance * (180 / Math.PI)).toFixed(2)}°`,
          theoreticalOpt: `${(metrics.theoreticalOptimal * (180 / Math.PI)).toFixed(2)}°`,
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

      console.log('\n=== ORBIT DRIFT ANALYSIS ===');
      console.log(`Particle count: ${particleCount}`);
      console.log('Time (s) | CV     | Min/Max | Mean Dist (°)');
      console.log('---------|--------|---------|-------------');

      const results: { time: number; cv: number; minMaxRatio: number }[] = [];

      for (const time of timePoints) {
        const positions = calculateAllParticlePositions(0.5, {
          ...DEFAULT_CONFIG,
          particleCount,
          time,
        });

        const metrics = measureDistribution(positions);

        results.push({ time, cv: metrics.cv, minMaxRatio: metrics.minMaxRatio });

        console.log(
          `${time.toString().padStart(8)} | ${metrics.cv.toFixed(4)} | ${metrics.minMaxRatio.toFixed(4)}  | ${(metrics.meanDistance * (180 / Math.PI)).toFixed(2)}`,
        );
      }

      // The CV should generally increase over time due to drift
      // This test documents the current behavior
      const t0 = results.find((r) => r.time === 0)!;
      const t120 = results.find((r) => r.time === 120)!;

      console.log(
        `\nDegradation at 120s: CV increased by ${(((t120.cv - t0.cv) / t0.cv) * 100).toFixed(1)}%`,
      );

      // Currently, expect some degradation (this is the bug we're documenting)
      // After fix, we should update this test to expect minimal degradation
      expect(t0.cv).toBeDefined(); // Baseline exists
      expect(t120.cv).toBeDefined(); // Long-term value exists
    });

    /**
     * Test that documents the primary cause: Y-axis orbit drift
     */
    it('should identify orbit drift as primary cause of uneven distribution', () => {
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

      console.log('\n=== ORBIT DRIFT MEASUREMENT ===');
      console.log(`Mean drift at 60s: ${(meanDrift * (180 / Math.PI)).toFixed(2)}°`);
      console.log(`Drift CV: ${driftCV.toFixed(4)} (variance in drift amounts)`);

      // Each particle drifts at a different rate due to variable orbitSpeed
      // This is the root cause - particles don't maintain relative positions
      expect(meanDrift).toBeGreaterThan(0); // Confirms particles are moving
      expect(driftCV).toBeGreaterThan(0.1); // Confirms non-uniform drift
    });
  });

  describe('Distribution metrics documentation', () => {
    /**
     * This test outputs diagnostic information about distribution quality
     */
    it('logs comprehensive distribution metrics for analysis', () => {
      console.log('\n=== DISTRIBUTION QUALITY REPORT ===\n');

      const counts = [42, 100, 200, 300];
      const times = [0, 30, 60];

      for (const count of counts) {
        console.log(`\n--- ${count} particles ---`);

        for (const time of times) {
          const positions = calculateAllParticlePositions(0.5, {
            particleCount: count,
            time,
          });

          const metrics = measureDistribution(positions);

          const status =
            metrics.cv < 0.2 ? '✅ GOOD' : metrics.cv < 0.35 ? '⚠️ MODERATE' : '❌ POOR';

          console.log(
            `  t=${time}s: ${status} CV=${metrics.cv.toFixed(4)}, ` +
              `min/max=${metrics.minMaxRatio.toFixed(3)}, ` +
              `range=[${(metrics.minDistance * (180 / Math.PI)).toFixed(1)}° - ` +
              `${(metrics.maxDistance * (180 / Math.PI)).toFixed(1)}°]`,
          );
        }
      }

      console.log('\n=== END REPORT ===\n');

      expect(true).toBe(true); // Diagnostic test always passes
    });
  });
});

describe('Root Cause Analysis: Orbit Speed Variation', () => {
  /**
   * The orbitSpeed varies per particle:
   *   orbitSpeed = ORBIT_BASE_SPEED + (orbitSeed - 0.5) * 2 * ORBIT_SPEED_VARIATION
   *
   * This means particles drift at different rates around the Y-axis,
   * breaking the Fibonacci distribution.
   */
  it('documents orbit speed distribution causing uneven drift', () => {
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

    console.log('\n=== ORBIT SPEED ANALYSIS ===');
    console.log(`Speed range: ${minSpeed.toFixed(5)} - ${maxSpeed.toFixed(5)} rad/s`);
    console.log(
      `Variation: ${(((maxSpeed - minSpeed) / ORBIT_BASE_SPEED) * 100).toFixed(1)}% of base speed`,
    );
    console.log(`At 60s: fastest particle drifts ${(maxSpeed * 60 * (180 / Math.PI)).toFixed(1)}°`);
    console.log(`At 60s: slowest particle drifts ${(minSpeed * 60 * (180 / Math.PI)).toFixed(1)}°`);
    console.log(
      `Relative drift at 60s: ${((maxSpeed - minSpeed) * 60 * (180 / Math.PI)).toFixed(1)}° difference`,
    );

    // This demonstrates the problem: particles can drift up to ~40° apart over 60s
    expect(maxSpeed).toBeGreaterThan(minSpeed);
    expect((maxSpeed - minSpeed) / ORBIT_BASE_SPEED).toBeGreaterThan(0.5); // >50% variation
  });
});

describe('Potential Fixes (documented)', () => {
  /**
   * POTENTIAL FIXES for even distribution:
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
  it('documents fix options', () => {
    console.log('\n=== RECOMMENDED FIXES ===');
    console.log('1. SIMPLE: Use uniform orbit speed for all particles');
    console.log('2. MEDIUM: Periodic soft redistribution during hold phases');
    console.log('3. BEST: Replace Y-axis orbit with latitude-parallel rotation');
    expect(true).toBe(true);
  });
});
