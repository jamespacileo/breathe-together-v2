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
  calculateKeplerianVelocity,
  calculateOrbitRadius,
  calculateShardSize,
  checkGlobeCollisions,
  checkParticleCollisions,
  DEFAULT_CONFIG,
  GLOBE_CONFIG,
  KEPLERIAN_CONFIG,
  PARTICLE_ORBIT_CONFIG,
  runComprehensiveCollisionTest,
  runTimeVaryingCollisionTest,
  verifySurfaceDistance,
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
    // Expected values from centralized config:
    // MIN_ORBIT_RADIUS = globeRadius × (1 + INHALE_SURFACE_DISTANCE_RATIO) = 1.5 × 1.5 = 2.25
    // MAX_ORBIT_RADIUS = globeRadius × (1 + EXHALE_SURFACE_DISTANCE_RATIO) = 1.5 × 4.0 = 6.0
    const expectedMinOrbit = PARTICLE_ORBIT_CONFIG.MIN_ORBIT_RADIUS; // 2.25
    const expectedMaxOrbit = PARTICLE_ORBIT_CONFIG.MAX_ORBIT_RADIUS; // 6.0

    it('should return max radius at breathPhase=0 (exhale)', () => {
      const radius = calculateOrbitRadius(0);
      expect(radius).toBeCloseTo(expectedMaxOrbit, 5);
    });

    it('should return min radius at breathPhase=1 (inhale)', () => {
      const radius = calculateOrbitRadius(1);
      expect(radius).toBeCloseTo(expectedMinOrbit, 5);
    });

    it('should interpolate linearly between phases', () => {
      const radiusMid = calculateOrbitRadius(0.5);
      expect(radiusMid).toBeCloseTo((expectedMaxOrbit + expectedMinOrbit) / 2, 2);
    });

    it('should have min orbit at half globe radius from surface', () => {
      // Key requirement: On inhale, particles should be 0.5 × globe radius from surface
      const expectedSurfaceDistance =
        GLOBE_CONFIG.RADIUS * PARTICLE_ORBIT_CONFIG.INHALE_SURFACE_DISTANCE_RATIO;
      const actualSurfaceDistance = expectedMinOrbit - GLOBE_CONFIG.RADIUS;
      expect(actualSurfaceDistance).toBeCloseTo(expectedSurfaceDistance, 5);
      // Verify it's half globe radius
      expect(actualSurfaceDistance).toBeCloseTo(GLOBE_CONFIG.RADIUS * 0.5, 5);
    });
  });

  describe('calculateAllParticlePositions', () => {
    const expectedMaxOrbit = PARTICLE_ORBIT_CONFIG.MAX_ORBIT_RADIUS;

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
      // At breathPhase=0, particles should be near max orbit
      const positionsExhale = calculateAllParticlePositions(0, { particleCount: 20, time: 0 });
      const avgDistanceExhale =
        positionsExhale.reduce((sum, p) => sum + p.length(), 0) / positionsExhale.length;

      // At breathPhase=1, particles orbit at dynamic min radius
      // Dynamic min = max(globeConstraint, spacingConstraint) based on particle count
      const positionsInhale = calculateAllParticlePositions(1, { particleCount: 20, time: 0 });
      const avgDistanceInhale =
        positionsInhale.reduce((sum, p) => sum + p.length(), 0) / positionsInhale.length;

      // Exhale: should be near max orbit (from config)
      expect(avgDistanceExhale).toBeGreaterThan(expectedMaxOrbit - 0.5);
      expect(avgDistanceExhale).toBeLessThan(expectedMaxOrbit + 0.5);

      // Inhale: must be above globe radius and below max orbit
      expect(avgDistanceInhale).toBeGreaterThan(GLOBE_CONFIG.RADIUS);
      expect(avgDistanceInhale).toBeLessThan(expectedMaxOrbit);

      // Exhale should be further than inhale
      expect(avgDistanceExhale).toBeGreaterThan(avgDistanceInhale);
    });
  });
});

/**
 * Surface Distance Verification Tests
 *
 * Verifies that particles are positioned at the expected distance from the globe surface,
 * as specified in the centralized config. Key requirement: on max inhale, particles should
 * be at 0.5 × globe radius from the surface (where the earth texture is rendered).
 */
describe('Surface Distance Verification', () => {
  const particleCounts = [20, 50, 100, 200, 300];

  describe('at max inhale (breathPhase=1.0)', () => {
    // Expected surface distance = globeRadius × INHALE_SURFACE_DISTANCE_RATIO = 1.5 × 0.5 = 0.75
    const expectedInhaleSurfaceDistance =
      GLOBE_CONFIG.RADIUS * PARTICLE_ORBIT_CONFIG.INHALE_SURFACE_DISTANCE_RATIO;

    it.each(
      particleCounts,
    )('particles should be ~0.5 globe radius from surface with %i particles', (count) => {
      const result = verifySurfaceDistance(1.0, { particleCount: count });

      // Log for debugging
      console.log(`[SURFACE] ${count} particles at inhale:`, {
        avgSurfaceDistance: result.avgSurfaceDistance.toFixed(3),
        expected: result.expectedSurfaceDistance.toFixed(3),
        ratio: result.ratio.toFixed(3),
        globeRadius: result.globeRadius,
      });

      // Verify the expected value matches our config
      expect(result.expectedSurfaceDistance).toBeCloseTo(expectedInhaleSurfaceDistance, 5);

      // Allow tolerance for dynamic min orbit adjustments at high particle counts
      // Dynamic min may be higher than theoretical min due to collision prevention
      expect(result.avgSurfaceDistance).toBeGreaterThanOrEqual(expectedInhaleSurfaceDistance * 0.8);
    });

    it('should match half globe radius specification', () => {
      // Core requirement: surface distance on inhale = 0.5 × globe radius
      const halfGlobeRadius = GLOBE_CONFIG.RADIUS * 0.5;
      expect(expectedInhaleSurfaceDistance).toBeCloseTo(halfGlobeRadius, 5);
    });
  });

  describe('at max exhale (breathPhase=0)', () => {
    // Expected surface distance = globeRadius × EXHALE_SURFACE_DISTANCE_RATIO = 1.5 × 3.0 = 4.5
    const expectedExhaleSurfaceDistance =
      GLOBE_CONFIG.RADIUS * PARTICLE_ORBIT_CONFIG.EXHALE_SURFACE_DISTANCE_RATIO;

    it.each(
      particleCounts,
    )('particles should be ~3.0 globe radii from surface with %i particles', (count) => {
      const result = verifySurfaceDistance(0, { particleCount: count });

      // Log for debugging
      console.log(`[SURFACE] ${count} particles at exhale:`, {
        avgSurfaceDistance: result.avgSurfaceDistance.toFixed(3),
        expected: result.expectedSurfaceDistance.toFixed(3),
        ratio: result.ratio.toFixed(3),
      });

      // Exhale should be within tolerance of expected
      // Allow slightly higher tolerance (0.1) due to ambient motion variation
      expect(result.withinTolerance).toBe(true);
      expect(result.avgSurfaceDistance).toBeCloseTo(expectedExhaleSurfaceDistance, 0);
    });
  });

  describe('surface distance scales with breath phase', () => {
    it('should decrease linearly from exhale to inhale', () => {
      const phases = [0, 0.25, 0.5, 0.75, 1.0];
      const results = phases.map((phase) => ({
        phase,
        result: verifySurfaceDistance(phase, { particleCount: 50 }),
      }));

      // Each phase should have smaller surface distance than the previous
      for (let i = 1; i < results.length; i++) {
        expect(results[i].result.avgSurfaceDistance).toBeLessThan(
          results[i - 1].result.avgSurfaceDistance,
        );
      }

      // Log the progression
      console.log('\n[SURFACE] Breath phase progression:');
      for (const { phase, result } of results) {
        console.log(
          `  phase=${phase.toFixed(2)}: surface=${result.avgSurfaceDistance.toFixed(3)} ` +
            `(expected=${result.expectedSurfaceDistance.toFixed(3)}, ratio=${result.ratio.toFixed(3)})`,
        );
      }
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

/**
 * Keplerian Velocity Tests
 *
 * Verifies that orbital velocity follows Kepler's Law: v = √(GM/r)
 * - Smaller radius → faster velocity (particles speed up when closer)
 * - Larger radius → slower velocity (particles slow down when farther)
 *
 * Also tests breath-modulated "apparent mass":
 * - During inhale: mass increases → stronger gravitational pull → faster orbits
 * - During exhale: mass decreases → weaker pull → slower orbits
 */
describe('Keplerian Velocity Physics', () => {
  const BASE_SPEED = KEPLERIAN_CONFIG.BASE_ORBIT_SPEED;

  describe("Kepler's Law: v = √(GM/r)", () => {
    it('should increase velocity at smaller radii (closer to globe)', () => {
      const breathPhase = 0.5; // Neutral breath phase
      const smallRadius = 2.0;
      const largeRadius = 5.0;

      const velocityClose = calculateKeplerianVelocity(smallRadius, breathPhase, BASE_SPEED);
      const velocityFar = calculateKeplerianVelocity(largeRadius, breathPhase, BASE_SPEED);

      expect(velocityClose.velocity).toBeGreaterThan(velocityFar.velocity);
      console.log(`Velocity at r=${smallRadius}: ${velocityClose.velocity.toFixed(4)}`);
      console.log(`Velocity at r=${largeRadius}: ${velocityFar.velocity.toFixed(4)}`);
    });

    it('should decrease velocity at larger radii (farther from globe)', () => {
      const breathPhase = 0.5;
      const radii = [2.0, 3.0, 4.0, 5.0, 6.0];
      const velocities = radii.map((r) => calculateKeplerianVelocity(r, breathPhase, BASE_SPEED));

      // Each velocity should be less than the previous (as radius increases)
      for (let i = 1; i < velocities.length; i++) {
        expect(velocities[i].velocity).toBeLessThan(velocities[i - 1].velocity);
      }

      console.log('\n[KEPLER] Velocity vs Radius:');
      for (let i = 0; i < radii.length; i++) {
        console.log(
          `  r=${radii[i].toFixed(1)}: v=${velocities[i].velocity.toFixed(4)} (ratio=${velocities[i].velocityRatio.toFixed(3)})`,
        );
      }
    });

    it('should follow inverse square root relationship', () => {
      const breathPhase = 0.5;
      const r1 = 2.0;
      const r2 = 8.0; // 4x the radius

      const v1 = calculateKeplerianVelocity(r1, breathPhase, BASE_SPEED);
      const v2 = calculateKeplerianVelocity(r2, breathPhase, BASE_SPEED);

      // v ∝ 1/√r, so if r2 = 4*r1, then v2 = v1/√4 = v1/2
      // However, this is before clamping and mass modulation
      // The unclamped ratio should follow: v1/v2 = √(r2/r1)
      const expectedRatio = Math.sqrt(r2 / r1); // √4 = 2
      const actualRatio = v1.velocityRatio / v2.velocityRatio;

      expect(actualRatio).toBeCloseTo(expectedRatio, 1);
      console.log(
        `Expected v1/v2 ratio: ${expectedRatio.toFixed(3)}, actual: ${actualRatio.toFixed(3)}`,
      );
    });

    it('should return baseSpeed at reference radius (normalized)', () => {
      const breathPhase = 0.5;
      const refRadius = KEPLERIAN_CONFIG.REFERENCE_RADIUS;

      const result = calculateKeplerianVelocity(refRadius, breathPhase, BASE_SPEED);

      // At reference radius with neutral breath phase, velocity ratio should be ~1.0
      // (Not exactly 1.0 due to breath mass modulation, but close)
      expect(result.velocityRatio).toBeCloseTo(1.0, 1);
      console.log(`At reference radius ${refRadius}: ratio=${result.velocityRatio.toFixed(3)}`);
    });
  });

  describe('Breath-Modulated Apparent Mass', () => {
    it('should increase velocity during inhale (stronger gravitational pull)', () => {
      const radius = 3.0;
      const velocityExhale = calculateKeplerianVelocity(radius, 0, BASE_SPEED);
      const velocityInhale = calculateKeplerianVelocity(radius, 1, BASE_SPEED);

      expect(velocityInhale.velocity).toBeGreaterThan(velocityExhale.velocity);
      expect(velocityInhale.effectiveGM).toBeGreaterThan(velocityExhale.effectiveGM);

      console.log('\n[BREATH] Velocity at breath phases:');
      console.log(
        `  Exhale (phase=0): v=${velocityExhale.velocity.toFixed(4)}, GM=${velocityExhale.effectiveGM.toFixed(3)}`,
      );
      console.log(
        `  Inhale (phase=1): v=${velocityInhale.velocity.toFixed(4)}, GM=${velocityInhale.effectiveGM.toFixed(3)}`,
      );
    });

    it('should decrease velocity during exhale (weaker gravitational pull)', () => {
      const radius = 3.0;
      const breathPhases = [0, 0.25, 0.5, 0.75, 1.0];
      const results = breathPhases.map((bp) => ({
        phase: bp,
        result: calculateKeplerianVelocity(radius, bp, BASE_SPEED),
      }));

      // Velocity should increase monotonically with breath phase
      for (let i = 1; i < results.length; i++) {
        expect(results[i].result.velocity).toBeGreaterThan(results[i - 1].result.velocity);
      }

      console.log('\n[BREATH] Velocity progression:');
      for (const { phase, result } of results) {
        console.log(
          `  phase=${phase.toFixed(2)}: v=${result.velocity.toFixed(4)} (GM=${result.effectiveGM.toFixed(3)})`,
        );
      }
    });

    it('should have neutral mass at mid-breath (breathPhase=0.5)', () => {
      const radius = 3.0;
      const result = calculateKeplerianVelocity(radius, 0.5, BASE_SPEED);

      // At breathPhase=0.5: massModulation = 1 + 0.6*(0.5*2 - 1) = 1 + 0.6*0 = 1.0
      // So effectiveGM should equal BASE_GM
      expect(result.effectiveGM).toBeCloseTo(KEPLERIAN_CONFIG.BASE_GM, 5);
    });
  });

  describe('Velocity Clamping', () => {
    it('should clamp to MIN_VELOCITY_FACTOR at very large radii', () => {
      const veryLargeRadius = 100.0;
      const result = calculateKeplerianVelocity(veryLargeRadius, 0.5, BASE_SPEED);

      expect(result.wasClamped).toBe(true);
      expect(result.velocity).toBeCloseTo(BASE_SPEED * KEPLERIAN_CONFIG.MIN_VELOCITY_FACTOR, 5);
      console.log(`At r=${veryLargeRadius}: clamped to min, v=${result.velocity.toFixed(4)}`);
    });

    it('should clamp to MAX_VELOCITY_FACTOR at very small radii', () => {
      // Calculate the radius needed to trigger max velocity clamping
      // v = √(GM/r) and we need velocityRatio > MAX_VELOCITY_FACTOR
      // At breathPhase=1 (max GM), we need r < GM_max / (MAX_VELOCITY_FACTOR * referenceFactor)^2
      const verySmallRadius = 0.1; // Very close to center, will definitely trigger clamping
      const result = calculateKeplerianVelocity(verySmallRadius, 0.5, BASE_SPEED);

      expect(result.wasClamped).toBe(true);
      expect(result.velocity).toBeCloseTo(BASE_SPEED * KEPLERIAN_CONFIG.MAX_VELOCITY_FACTOR, 5);
      console.log(`At r=${verySmallRadius}: clamped to max, v=${result.velocity.toFixed(4)}`);
    });

    it('should not clamp at typical orbit radii', () => {
      const minOrbit = PARTICLE_ORBIT_CONFIG.MIN_ORBIT_RADIUS;
      const maxOrbit = PARTICLE_ORBIT_CONFIG.MAX_ORBIT_RADIUS;

      const resultMin = calculateKeplerianVelocity(minOrbit, 0.5, BASE_SPEED);
      const resultMax = calculateKeplerianVelocity(maxOrbit, 0.5, BASE_SPEED);

      // At typical orbits, velocity should not be clamped
      expect(resultMin.wasClamped).toBe(false);
      expect(resultMax.wasClamped).toBe(false);

      console.log(
        `At min orbit (${minOrbit}): v=${resultMin.velocity.toFixed(4)}, clamped=${resultMin.wasClamped}`,
      );
      console.log(
        `At max orbit (${maxOrbit}): v=${resultMax.velocity.toFixed(4)}, clamped=${resultMax.wasClamped}`,
      );
    });
  });

  describe('Combined: Orbit + Breath Effects', () => {
    it('should show maximum velocity at closest approach during inhale', () => {
      const minOrbit = PARTICLE_ORBIT_CONFIG.MIN_ORBIT_RADIUS;
      const maxOrbit = PARTICLE_ORBIT_CONFIG.MAX_ORBIT_RADIUS;

      // Closest + inhale = maximum velocity scenario
      const closeInhale = calculateKeplerianVelocity(minOrbit, 1.0, BASE_SPEED);
      // Farthest + exhale = minimum velocity scenario
      const farExhale = calculateKeplerianVelocity(maxOrbit, 0, BASE_SPEED);

      expect(closeInhale.velocity).toBeGreaterThan(farExhale.velocity);

      // The ratio should be significant (demonstrating visual difference)
      const velocityRange = closeInhale.velocity / farExhale.velocity;
      expect(velocityRange).toBeGreaterThan(1.5); // At least 1.5x difference

      console.log('\n[COMBINED] Velocity extremes:');
      console.log(`  Close+Inhale (r=${minOrbit}, bp=1): v=${closeInhale.velocity.toFixed(4)}`);
      console.log(`  Far+Exhale (r=${maxOrbit}, bp=0): v=${farExhale.velocity.toFixed(4)}`);
      console.log(`  Velocity range: ${velocityRange.toFixed(2)}x`);
    });

    it('should create visually perceptible speed differences', () => {
      // At inhale position (close to globe), particles should noticeably speed up
      const inhaleRadius = PARTICLE_ORBIT_CONFIG.MIN_ORBIT_RADIUS;
      const inhaleVelocity = calculateKeplerianVelocity(inhaleRadius, 1.0, BASE_SPEED);

      // At exhale position (far from globe), particles should noticeably slow down
      const exhaleRadius = PARTICLE_ORBIT_CONFIG.MAX_ORBIT_RADIUS;
      const exhaleVelocity = calculateKeplerianVelocity(exhaleRadius, 0, BASE_SPEED);

      // Calculate angular velocity in degrees per second for human perception reference
      const inhaleAngularDeg = (inhaleVelocity.velocity * 180) / Math.PI;
      const exhaleAngularDeg = (exhaleVelocity.velocity * 180) / Math.PI;

      console.log('\n[PERCEPTION] Angular velocity (deg/s):');
      console.log(`  Inhale: ${inhaleAngularDeg.toFixed(2)}°/s`);
      console.log(`  Exhale: ${exhaleAngularDeg.toFixed(2)}°/s`);
      console.log(`  Difference: ${(inhaleAngularDeg - exhaleAngularDeg).toFixed(2)}°/s`);

      // Verify meaningful difference exists
      expect(inhaleAngularDeg).toBeGreaterThan(exhaleAngularDeg);
    });
  });
});
