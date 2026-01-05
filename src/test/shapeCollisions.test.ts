/**
 * Shape Collision Tests for ParticleSwarm
 *
 * OUTCOME-FOCUSED: Validates that particles maintain proper spacing at all times,
 * ensuring users see clean, non-overlapping particle animations.
 *
 * Why this matters:
 * - Overlapping particles create visual glitches (bad UX)
 * - Collisions with globe break the spherical aesthetic
 * - Wobble and breathing can temporarily reduce spacing
 *
 * Testing approach:
 * - Uses shared collision helpers for consistent assertions
 * - Tests critical breath phases (inhale = tightest spacing)
 * - Scans time-varying effects (wobble period) for worst cases
 * - Pure functions enable testing without WebGL
 */

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  calculateAllParticlePositions,
  calculateOrbitRadius,
  calculateShardSize,
  checkGlobeCollisions,
  checkParticleCollisions,
  DEFAULT_CONFIG,
  runComprehensiveCollisionTest,
  runTimeVaryingCollisionTest,
} from '../lib/collisionGeometry';
import {
  expectNoGlobeCollisions,
  expectNoParticleCollisions,
  expectValidCollisionResult,
} from './helpers';

describe('Shape Collision Detection', () => {
  /**
   * Test particle-particle collisions at various counts
   * Critical test: breathPhase=1.0 (inhale) when particles are closest to globe
   */
  describe('Particle-Particle Collisions', () => {
    // OUTCOME: Users see clean particle animations at all user presence levels
    const particleCounts = [50, 100, 200, 300, 500];

    describe('at full inhale (breathPhase=1.0) - particles closest together', () => {
      // OUTCOME: Worst-case spacing (particles at minimum orbit) maintains visual clarity
      it.each(particleCounts)('should have no collisions with %i particles', (count) => {
        expectNoParticleCollisions(1.0, { particleCount: count });
      });
    });

    describe('at mid-breath (breathPhase=0.5)', () => {
      // OUTCOME: Mid-cycle animations maintain spacing
      it.each(particleCounts)('should have no collisions with %i particles', (count) => {
        expectNoParticleCollisions(0.5, { particleCount: count });
      });
    });

    describe('at full exhale (breathPhase=0) - particles most spread', () => {
      // OUTCOME: Maximum spacing provides comfortable visual margin
      it.each(particleCounts)('should have no collisions with %i particles', (count) => {
        expectNoParticleCollisions(0.0, { particleCount: count });
      });
    });

    it('should maintain no-collision property across any breath phase', () => {
      // PROPERTY: No collisions at any breath phase, not just test points
      // Uses property-based testing to verify continuous behavior
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1 }),
          fc.integer({ min: 50, max: 300 }),
          (breathPhase, particleCount) => {
            const result = checkParticleCollisions(breathPhase, { particleCount });
            expectValidCollisionResult(result);
            expect(result.hasCollision).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Time-varying test: Scan across wobble period to find worst case
     * Wobble and ambient motion can temporarily bring particles closer
     */
    describe('worst-case across wobble period', () => {
      it.each(
        particleCounts,
      )('should have no collisions with %i particles at worst wobble alignment', (count) => {
        const { worst, worstTime } = runTimeVaryingCollisionTest(1.0, {
          particleCount: count,
        });

        expect(worst.hasCollision).toBe(false);

        if (worst.hasCollision) {
          console.log(`[COLLISION] ${count} particles at worst time ${worstTime.toFixed(2)}s:`, {
            minDistance: worst.minParticleDistance.toFixed(4),
            required: worst.requiredMinDistance.toFixed(4),
            overlap: worst.overlapAmount.toFixed(4),
          });
        }
      });
    });
  });

  /**
   * Test particle-globe collisions
   * Particles must not intersect the central globe at any breathing phase
   */
  describe('Particle-Globe Collisions', () => {
    const particleCounts = [50, 100, 200, 300, 500];

    describe('at full inhale (breathPhase=1.0) - particles closest to globe', () => {
      it.each(particleCounts)('should not intersect globe with %i particles', (count) => {
        const result = checkGlobeCollisions(1.0, { particleCount: count });

        expect(result.hasCollision).toBe(false);
        expect(result.minSurfaceDistance).toBeGreaterThanOrEqual(result.requiredMinDistance);

        if (result.hasCollision) {
          console.log(`[GLOBE COLLISION] ${count} particles at breathPhase=1.0:`, {
            minSurfaceDistance: result.minSurfaceDistance.toFixed(4),
            required: result.requiredMinDistance.toFixed(4),
            overlap: result.overlapAmount.toFixed(4),
            closestParticle: result.closestParticleIndex,
          });
        }
      });
    });

    describe('across full breathing cycle', () => {
      it.each(
        particleCounts,
      )('should not intersect globe at any breath phase with %i particles', (count) => {
        const result = runComprehensiveCollisionTest({ particleCount: count });

        expect(result.globe.hasCollision).toBe(false);

        if (result.globe.hasCollision) {
          console.log(`[GLOBE COLLISION] ${count} particles at phase ${result.globe.worstPhase}:`, {
            minSurfaceDistance: result.globe.minSurfaceDistance.toFixed(4),
            required: result.globe.requiredMinDistance.toFixed(4),
            overlap: result.globe.overlapAmount.toFixed(4),
          });
        }
      });
    });
  });

  /**
   * Comprehensive test: worst-case across entire breathing cycle
   */
  describe('Comprehensive Breathing Cycle Tests', () => {
    const particleCounts = [50, 100, 200, 300, 500];

    it.each(
      particleCounts,
    )('should have no collisions throughout breathing cycle with %i particles', (count) => {
      const result = runComprehensiveCollisionTest({ particleCount: count });

      // Check particle-particle collisions
      expect(result.particle.hasCollision).toBe(false);

      // Check particle-globe collisions
      expect(result.globe.hasCollision).toBe(false);

      if (result.particle.hasCollision || result.globe.hasCollision) {
        console.log(`[COMPREHENSIVE] ${count} particles collision report:`, {
          particleCollision: result.particle.hasCollision,
          particleWorstPhase: result.particle.worstPhase,
          particleMinDistance: result.particle.minParticleDistance.toFixed(4),
          particleRequired: result.particle.requiredMinDistance.toFixed(4),
          globeCollision: result.globe.hasCollision,
          globeWorstPhase: result.globe.worstPhase,
          globeMinDistance: result.globe.minSurfaceDistance.toFixed(4),
          globeRequired: result.globe.requiredMinDistance.toFixed(4),
        });
      }
    });
  });
});

/**
 * Unit tests for collision geometry calculations
 */
describe('Collision Geometry Calculations', () => {
  describe('calculateShardSize', () => {
    it('should decrease with particle count (inverse square root)', () => {
      const size50 = calculateShardSize({ ...DEFAULT_CONFIG, particleCount: 50 });
      const size100 = calculateShardSize({ ...DEFAULT_CONFIG, particleCount: 100 });
      const size200 = calculateShardSize({ ...DEFAULT_CONFIG, particleCount: 200 });

      expect(size50).toBeGreaterThan(size100);
      expect(size100).toBeGreaterThan(size200);

      // Ratio should be ~sqrt(2) ≈ 1.414
      expect(size50 / size100).toBeCloseTo(Math.sqrt(2), 1);
    });

    it('should respect min/max bounds', () => {
      const sizeVeryLow = calculateShardSize({ ...DEFAULT_CONFIG, particleCount: 1 });
      const sizeVeryHigh = calculateShardSize({ ...DEFAULT_CONFIG, particleCount: 10000 });

      expect(sizeVeryLow).toBeLessThanOrEqual(DEFAULT_CONFIG.maxShardSize);
      expect(sizeVeryHigh).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minShardSize);
    });
  });

  describe('calculateOrbitRadius', () => {
    it('should return max radius at breathPhase=0 (exhale)', () => {
      const radius = calculateOrbitRadius(0);
      expect(radius).toBe(6.0); // VISUALS.PARTICLE_ORBIT_MAX
    });

    it('should return min radius at breathPhase=1 (inhale)', () => {
      const radius = calculateOrbitRadius(1);
      expect(radius).toBe(2.5); // VISUALS.PARTICLE_ORBIT_MIN
    });

    it('should interpolate linearly between phases', () => {
      const radiusMid = calculateOrbitRadius(0.5);
      expect(radiusMid).toBeCloseTo((6.0 + 2.5) / 2, 2);
    });
  });

  describe('calculateAllParticlePositions', () => {
    it('should return correct number of positions', () => {
      const positions50 = calculateAllParticlePositions(0, { particleCount: 50 });
      const positions100 = calculateAllParticlePositions(0, { particleCount: 100 });

      expect(positions50).toHaveLength(50);
      expect(positions100).toHaveLength(100);
    });

    it('should produce deterministic results for same inputs', () => {
      const positions1 = calculateAllParticlePositions(0.5, { particleCount: 42, time: 1.5 });
      const positions2 = calculateAllParticlePositions(0.5, { particleCount: 42, time: 1.5 });

      for (let i = 0; i < positions1.length; i++) {
        expect(positions1[i].x).toBeCloseTo(positions2[i].x, 10);
        expect(positions1[i].y).toBeCloseTo(positions2[i].y, 10);
        expect(positions1[i].z).toBeCloseTo(positions2[i].z, 10);
      }
    });

    it('should place particles at correct orbit radius (approximately)', () => {
      // At breathPhase=0, particles should be near max orbit (6.0)
      const positionsExhale = calculateAllParticlePositions(0, { particleCount: 20, time: 0 });
      const avgDistanceExhale =
        positionsExhale.reduce((sum, p) => sum + p.length(), 0) / positionsExhale.length;

      // At breathPhase=1, particles orbit at dynamic min radius
      // Dynamic min = max(globeConstraint, spacingConstraint) based on particle count
      // For 20 particles: spacingConstraint dominates for collision prevention
      const positionsInhale = calculateAllParticlePositions(1, { particleCount: 20, time: 0 });
      const avgDistanceInhale =
        positionsInhale.reduce((sum, p) => sum + p.length(), 0) / positionsInhale.length;

      // Exhale: should be near max orbit (6.0)
      expect(avgDistanceExhale).toBeGreaterThan(5.5);
      expect(avgDistanceExhale).toBeLessThan(6.5);

      // Inhale: dynamic min orbit ensures collision-free spacing
      // Must be > 2.0 (globe + buffer) and < 6.0 (max orbit)
      // With 20 particles, dynamic min is ~3.2 for collision prevention
      expect(avgDistanceInhale).toBeGreaterThan(2.0);
      expect(avgDistanceInhale).toBeLessThan(6.0);

      // Exhale should be further than inhale
      expect(avgDistanceExhale).toBeGreaterThan(avgDistanceInhale);
    });
  });
});

/**
 * Diagnostic tests - always pass but log useful collision metrics
 * Run with `npm test -- --reporter=verbose` to see output
 */
describe('Collision Diagnostics', () => {
  it('logs collision metrics for analysis', () => {
    console.log('\n=== COLLISION DIAGNOSTICS ===\n');

    const counts = [50, 100, 200, 300, 500];
    const phases = [0, 0.5, 1.0];

    for (const count of counts) {
      const shardSize = calculateShardSize({ ...DEFAULT_CONFIG, particleCount: count });
      console.log(`\n${count} particles (shardSize: ${shardSize.toFixed(4)}):`);

      for (const phase of phases) {
        const particleResult = checkParticleCollisions(phase, { particleCount: count });
        const globeResult = checkGlobeCollisions(phase, { particleCount: count });

        const pStatus = particleResult.hasCollision ? '❌ COLLISION' : '✅ OK';
        const gStatus = globeResult.hasCollision ? '❌ COLLISION' : '✅ OK';

        console.log(
          `  phase=${phase.toFixed(1)}: ` +
            `particles ${pStatus} (min: ${particleResult.minParticleDistance.toFixed(3)}, ` +
            `req: ${particleResult.requiredMinDistance.toFixed(3)}) | ` +
            `globe ${gStatus} (surface: ${globeResult.minSurfaceDistance.toFixed(3)}, ` +
            `req: ${globeResult.requiredMinDistance.toFixed(3)})`,
        );
      }
    }

    console.log('\n=== END DIAGNOSTICS ===\n');

    // This test always passes - it's for diagnostics only
    expect(true).toBe(true);
  });
});
