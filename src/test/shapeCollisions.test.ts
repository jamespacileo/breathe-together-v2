/**
 * Shape Collision Tests for ParticleSwarm
 *
 * Tests collision detection at various breathing phases and particle counts.
 *
 * Design patterns used:
 * 1. **Parameterized breath phase** - Instead of waiting for real-time 19s cycle,
 *    we directly test at specific breath phases (0, 0.5, 1.0).
 *
 * 2. **Time-varying tests** - We scan across wobble/ambient periods to find
 *    worst-case collision scenarios.
 *
 * 3. **Pure function extraction** - Position calculations are extracted into
 *    collisionGeometry.ts for testability without WebGL.
 *
 * These tests are expected to FAIL initially because:
 * - At high particle counts (300+), Fibonacci spacing becomes tight
 * - Inhale phase (breathPhase=1) brings particles to minimum orbit radius
 * - Wobble and ambient motion can push particles into each other
 */

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

describe('Shape Collision Detection', () => {
  /**
   * Test particle-particle collisions at various counts
   * Critical test: breathPhase=1.0 (inhale) when particles are closest to globe
   */
  describe('Particle-Particle Collisions', () => {
    const particleCounts = [50, 100, 200, 300, 500];

    describe('at full inhale (breathPhase=1.0) - particles closest together', () => {
      it.each(particleCounts)('should have no collisions with %i particles', (count) => {
        const result = checkParticleCollisions(1.0, { particleCount: count });

        expect(result.hasCollision).toBe(false);
        expect(result.minParticleDistance).toBeGreaterThanOrEqual(result.requiredMinDistance);

        // Log collision details for debugging when test fails
        if (result.hasCollision) {
          console.log(`[COLLISION] ${count} particles at breathPhase=1.0:`, {
            minDistance: result.minParticleDistance.toFixed(4),
            required: result.requiredMinDistance.toFixed(4),
            overlap: result.overlapAmount.toFixed(4),
            pair: result.minDistancePair,
          });
        }
      });
    });

    describe('at mid-breath (breathPhase=0.5)', () => {
      it.each(particleCounts)('should have no collisions with %i particles', (count) => {
        const result = checkParticleCollisions(0.5, { particleCount: count });
        expect(result.hasCollision).toBe(false);
      });
    });

    describe('at full exhale (breathPhase=0) - particles most spread', () => {
      it.each(particleCounts)('should have no collisions with %i particles', (count) => {
        const result = checkParticleCollisions(0.0, { particleCount: count });
        expect(result.hasCollision).toBe(false);
      });
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
      // With reduced maxShardSize (0.12), need higher particle counts to see the relationship
      // baseShardSize / sqrt(count) must be below maxShardSize (0.12) to avoid clamping
      // 4.0 / sqrt(1200) = 0.115, 4.0 / sqrt(2400) = 0.082, 4.0 / sqrt(4800) = 0.058
      const size1200 = calculateShardSize({ ...DEFAULT_CONFIG, particleCount: 1200 });
      const size2400 = calculateShardSize({ ...DEFAULT_CONFIG, particleCount: 2400 });
      const size4800 = calculateShardSize({ ...DEFAULT_CONFIG, particleCount: 4800 });

      expect(size1200).toBeGreaterThan(size2400);
      expect(size2400).toBeGreaterThan(size4800);

      // Ratio should be ~sqrt(2) ≈ 1.414
      expect(size1200 / size2400).toBeCloseTo(Math.sqrt(2), 1);
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
      expect(radius).toBeCloseTo(1.65, 5); // VISUALS.PARTICLE_ORBIT_MIN (reduced for closer approach)
    });

    it('should interpolate linearly between phases', () => {
      const radiusMid = calculateOrbitRadius(0.5);
      expect(radiusMid).toBeCloseTo((6.0 + 1.65) / 2, 2);
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
      // With reduced shard sizes (0.12 max) and wobble (0.11 margin), particles get closer
      const positionsInhale = calculateAllParticlePositions(1, { particleCount: 20, time: 0 });
      const avgDistanceInhale =
        positionsInhale.reduce((sum, p) => sum + p.length(), 0) / positionsInhale.length;

      // Exhale: should be near max orbit (6.0)
      expect(avgDistanceExhale).toBeGreaterThan(5.5);
      expect(avgDistanceExhale).toBeLessThan(6.5);

      // Inhale: dynamic min orbit with reduced shard sizes allows closer approach
      // Must be > 1.5 (globe radius) and < 6.0 (max orbit)
      // With 20 particles and smaller shards, dynamic min is ~1.65-2.0
      expect(avgDistanceInhale).toBeGreaterThan(1.5);
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
