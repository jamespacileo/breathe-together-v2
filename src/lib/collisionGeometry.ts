/**
 * Pure collision geometry calculations for testing particle swarm behavior.
 *
 * Extracts position calculation logic from ParticleSwarm into pure functions
 * that can be tested without WebGL or React dependencies.
 *
 * Key design decision: Uses deterministic calculations with explicit time/phase
 * parameters instead of relying on real-time breathing cycle.
 */

import * as THREE from 'three';
import {
  AMBIENT_MOTION_CONFIG,
  calculateExpectedSurfaceDistance,
  GLOBE_CONFIG,
  KEPLERIAN_CONFIG,
  SHARD_SIZE_CONFIG,
} from '../config/particlePhysics';
import { VISUALS } from '../constants';

/**
 * Configuration for particle swarm collision testing
 */
export interface CollisionTestConfig {
  /** Number of particles */
  particleCount: number;
  /** Globe radius @default 1.5 */
  globeRadius: number;
  /** Base shard size @default 4.0 */
  baseShardSize: number;
  /** Maximum shard size cap @default 0.6 */
  maxShardSize: number;
  /** Minimum shard size @default 0.15 */
  minShardSize: number;
  /** Buffer distance for globe collision @default 0.3 */
  buffer: number;
  /** Time value for ambient/wobble calculations (seconds) @default 0 */
  time: number;
}

/**
 * Default configuration matching ParticleSwarm props
 * Values are sourced from centralized particle physics config.
 */
export const DEFAULT_CONFIG: CollisionTestConfig = {
  particleCount: 42,
  globeRadius: GLOBE_CONFIG.RADIUS,
  baseShardSize: SHARD_SIZE_CONFIG.BASE_SIZE,
  maxShardSize: SHARD_SIZE_CONFIG.MAX_SIZE,
  minShardSize: SHARD_SIZE_CONFIG.MIN_SIZE,
  buffer: SHARD_SIZE_CONFIG.BUFFER,
  time: 0,
};

/**
 * Calculate Fibonacci sphere point for even distribution
 * Pure function - matches ParticleSwarm.getFibonacciSpherePoint
 */
export function getFibonacciSpherePoint(index: number, total: number): THREE.Vector3 {
  if (total <= 1) {
    return new THREE.Vector3(0, 1, 0);
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (total - 1)) * 2;
  const radiusAtY = Math.sqrt(1 - y * y);
  const theta = goldenAngle * index;
  const x = Math.cos(theta) * radiusAtY;
  const z = Math.sin(theta) * radiusAtY;

  return new THREE.Vector3(x, y, z);
}

/**
 * Calculate shard size based on particle count
 * Formula: baseShardSize / sqrt(count), clamped to [minShardSize, maxShardSize]
 */
export function calculateShardSize(config: CollisionTestConfig): number {
  const { particleCount, baseShardSize, minShardSize, maxShardSize } = config;
  const count = particleCount || 1;
  const calculated = baseShardSize / Math.sqrt(count);
  return Math.min(Math.max(calculated, minShardSize), maxShardSize);
}

/**
 * Calculate orbit radius from breath phase
 * breathPhase: 0 = exhaled (max radius), 1 = inhaled (min radius)
 */
export function calculateOrbitRadius(breathPhase: number): number {
  return (
    VISUALS.PARTICLE_ORBIT_MAX -
    breathPhase * (VISUALS.PARTICLE_ORBIT_MAX - VISUALS.PARTICLE_ORBIT_MIN)
  );
}

/**
 * Animation constants from centralized config
 */
const AMBIENT_SCALE = AMBIENT_MOTION_CONFIG.SCALE;
const AMBIENT_Y_SCALE = AMBIENT_MOTION_CONFIG.Y_SCALE;
const PERPENDICULAR_AMPLITUDE = AMBIENT_MOTION_CONFIG.WOBBLE_AMPLITUDE;
const PERPENDICULAR_FREQUENCY = AMBIENT_MOTION_CONFIG.WOBBLE_FREQUENCY;
const MAX_PHASE_OFFSET = AMBIENT_MOTION_CONFIG.MAX_PHASE_OFFSET;
const ORBIT_BASE_SPEED = KEPLERIAN_CONFIG.BASE_ORBIT_SPEED;
const ORBIT_SPEED_VARIATION = KEPLERIAN_CONFIG.ORBIT_SPEED_VARIATION;

/**
 * Per-particle state for deterministic position calculation
 */
interface ParticleState {
  /** Index in the swarm */
  index: number;
  /** Direction on Fibonacci sphere */
  direction: THREE.Vector3;
  /** Phase offset for wave effect */
  phaseOffset: number;
  /** Ambient seed for floating motion */
  ambientSeed: number;
  /** Orbit speed (radians/second) */
  orbitSpeed: number;
  /** Wobble seed */
  wobbleSeed: number;
}

/**
 * Create deterministic particle state
 */
function createParticleState(index: number, total: number): ParticleState {
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const orbitSeed = (index * Math.PI + 0.1) % 1;

  return {
    index,
    direction: getFibonacciSpherePoint(index, total),
    phaseOffset: ((index * goldenRatio) % 1) * MAX_PHASE_OFFSET,
    ambientSeed: index * 137.508,
    orbitSpeed: ORBIT_BASE_SPEED + (orbitSeed - 0.5) * 2 * ORBIT_SPEED_VARIATION,
    wobbleSeed: index * Math.E,
  };
}

/**
 * Calculate dynamic minimum orbit radius based on particle count and shard size.
 * Matches the logic in ParticleSwarm component.
 */
export function calculateDynamicMinOrbitRadius(config: CollisionTestConfig): number {
  const { particleCount, globeRadius, buffer } = config;
  const shardSize = calculateShardSize(config);

  // Constraint 1: Globe collision prevention
  const globeConstraint = globeRadius + shardSize + buffer;

  // Constraint 2: Inter-particle spacing
  // Fibonacci spacing factor: worst-case minimum is ~1.95 / sqrt(N) of radius
  // Wobble margin from centralized config
  const wobbleMargin = AMBIENT_MOTION_CONFIG.WOBBLE_MARGIN;
  const fibonacciSpacingFactor = 1.95;
  const requiredSpacing = 2 * shardSize + wobbleMargin;
  const spacingConstraint = (requiredSpacing * Math.sqrt(particleCount)) / fibonacciSpacingFactor;

  // Use the more restrictive constraint
  return Math.max(globeConstraint, spacingConstraint);
}

/**
 * Calculate single particle position at given breath phase and time
 *
 * This is the core position calculation extracted from ParticleSwarm's animation loop.
 * It produces deterministic results for the same inputs.
 */
export function calculateParticlePosition(
  state: ParticleState,
  breathPhase: number,
  config: CollisionTestConfig,
): THREE.Vector3 {
  const { time } = config;

  // Calculate base orbit radius from breath phase
  const baseOrbitRadius = calculateOrbitRadius(breathPhase);

  // Dynamic min orbit radius (collision prevention floor)
  const minOrbitRadius = calculateDynamicMinOrbitRadius(config);

  // Apply phase offset for wave effect
  const baseRadius = VISUALS.PARTICLE_ORBIT_MAX; // Used for offset calculation
  const phaseOffsetAmount = state.phaseOffset * (baseRadius - minOrbitRadius);
  const targetWithOffset = baseOrbitRadius + phaseOffsetAmount;

  // Clamp to min orbit radius
  const currentRadius = Math.max(targetWithOffset, minOrbitRadius);

  // Apply orbit angle based on time
  const orbitAngle = state.orbitSpeed * time;
  const yAxis = new THREE.Vector3(0, 1, 0);
  const orbitedDir = state.direction.clone().applyAxisAngle(yAxis, orbitAngle);

  // Calculate tangent vectors for wobble
  const tangent1 = orbitedDir.clone().cross(yAxis).normalize();
  if (tangent1.lengthSq() < 0.001) {
    tangent1.set(1, 0, 0);
  }
  const tangent2 = orbitedDir.clone().cross(tangent1).normalize();

  // Calculate wobble offsets
  const wobblePhase = time * PERPENDICULAR_FREQUENCY * Math.PI * 2 + state.wobbleSeed;
  const wobble1 = Math.sin(wobblePhase) * PERPENDICULAR_AMPLITUDE;
  const wobble2 = Math.cos(wobblePhase * 0.7) * PERPENDICULAR_AMPLITUDE * 0.6;

  // Calculate ambient floating motion
  const seed = state.ambientSeed;
  const ambient = new THREE.Vector3(
    Math.sin(time * 0.4 + seed) * AMBIENT_SCALE,
    Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE,
    Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE,
  );

  // Compose final position
  const position = orbitedDir
    .clone()
    .multiplyScalar(currentRadius)
    .addScaledVector(tangent1, wobble1)
    .addScaledVector(tangent2, wobble2)
    .add(ambient);

  return position;
}

/**
 * Calculate all particle positions for given configuration and breath phase
 */
export function calculateAllParticlePositions(
  breathPhase: number,
  config: Partial<CollisionTestConfig> = {},
): THREE.Vector3[] {
  const fullConfig: CollisionTestConfig = { ...DEFAULT_CONFIG, ...config };
  const { particleCount } = fullConfig;

  const positions: THREE.Vector3[] = [];
  for (let i = 0; i < particleCount; i++) {
    const state = createParticleState(i, particleCount);
    positions.push(calculateParticlePosition(state, breathPhase, fullConfig));
  }

  return positions;
}

/**
 * Collision detection result
 */
export interface CollisionResult {
  /** Whether any collision was detected */
  hasCollision: boolean;
  /** Minimum distance found between any two particles */
  minParticleDistance: number;
  /** Pair of particle indices with minimum distance */
  minDistancePair: [number, number];
  /** Required minimum distance (2 × shardSize) */
  requiredMinDistance: number;
  /** Overlap amount (negative if no overlap) */
  overlapAmount: number;
}

/**
 * Find minimum distance between any two particles
 *
 * Uses O(n²) comparison - acceptable for test scenarios up to ~500 particles.
 * For production collision detection, would need spatial partitioning.
 */
export function findMinParticleDistance(positions: THREE.Vector3[]): {
  minDistance: number;
  pair: [number, number];
} {
  let minDistance = Number.POSITIVE_INFINITY;
  let pair: [number, number] = [0, 0];

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const distance = positions[i].distanceTo(positions[j]);
      if (distance < minDistance) {
        minDistance = distance;
        pair = [i, j];
      }
    }
  }

  return { minDistance, pair };
}

/**
 * Check for particle-particle collisions
 *
 * Two particles collide if the distance between their centers
 * is less than the sum of their radii (approximated as spheres).
 */
export function checkParticleCollisions(
  breathPhase: number,
  config: Partial<CollisionTestConfig> = {},
): CollisionResult {
  const fullConfig: CollisionTestConfig = { ...DEFAULT_CONFIG, ...config };
  const positions = calculateAllParticlePositions(breathPhase, fullConfig);
  const shardSize = calculateShardSize(fullConfig);

  // Minimum required distance = diameter of one particle (both particles have same size)
  // Using shardSize as radius, distance must be > 2 * shardSize for no overlap
  const requiredMinDistance = shardSize * 2;

  const { minDistance, pair } = findMinParticleDistance(positions);

  return {
    hasCollision: minDistance < requiredMinDistance,
    minParticleDistance: minDistance,
    minDistancePair: pair,
    requiredMinDistance,
    overlapAmount: requiredMinDistance - minDistance,
  };
}

/**
 * Globe collision result
 */
export interface GlobeCollisionResult {
  /** Whether any particle collides with globe */
  hasCollision: boolean;
  /** Minimum distance from any particle center to globe surface */
  minSurfaceDistance: number;
  /** Index of particle closest to globe */
  closestParticleIndex: number;
  /** Required minimum distance (shard radius) */
  requiredMinDistance: number;
  /** Overlap amount (negative if no overlap) */
  overlapAmount: number;
}

/**
 * Check for particle-globe collisions
 *
 * A particle collides with the globe if the distance from its center
 * to the globe center is less than globeRadius + particleRadius.
 */
export function checkGlobeCollisions(
  breathPhase: number,
  config: Partial<CollisionTestConfig> = {},
): GlobeCollisionResult {
  const fullConfig: CollisionTestConfig = { ...DEFAULT_CONFIG, ...config };
  const positions = calculateAllParticlePositions(breathPhase, fullConfig);
  const shardSize = calculateShardSize(fullConfig);
  const { globeRadius } = fullConfig;

  let minCenterDistance = Number.POSITIVE_INFINITY;
  let closestIndex = 0;

  for (let i = 0; i < positions.length; i++) {
    const distance = positions[i].length(); // Distance from origin (globe center)
    if (distance < minCenterDistance) {
      minCenterDistance = distance;
      closestIndex = i;
    }
  }

  // Surface distance = center distance - globe radius
  const minSurfaceDistance = minCenterDistance - globeRadius;

  // Required: particle center must be at least shardSize away from globe surface
  const requiredMinDistance = shardSize;

  return {
    hasCollision: minSurfaceDistance < requiredMinDistance,
    minSurfaceDistance,
    closestParticleIndex: closestIndex,
    requiredMinDistance,
    overlapAmount: requiredMinDistance - minSurfaceDistance,
  };
}

/**
 * Run comprehensive collision tests across breathing cycle
 *
 * Tests at multiple breath phases to catch collisions at any point.
 * Returns the worst-case collision for both particle-particle and particle-globe.
 */
export interface ComprehensiveCollisionResult {
  particle: CollisionResult & { worstPhase: number };
  globe: GlobeCollisionResult & { worstPhase: number };
  phases: number[];
  config: CollisionTestConfig;
}

export function runComprehensiveCollisionTest(
  config: Partial<CollisionTestConfig> = {},
  phaseCount = 10,
): ComprehensiveCollisionResult {
  const fullConfig: CollisionTestConfig = { ...DEFAULT_CONFIG, ...config };

  // Test at multiple breath phases (0 to 1, inclusive)
  const phases = Array.from({ length: phaseCount + 1 }, (_, i) => i / phaseCount);

  // Initialize with first phase results
  const firstPhase = phases[0];
  let worstParticle = checkParticleCollisions(firstPhase, fullConfig);
  let worstParticlePhase = firstPhase;
  let worstGlobe = checkGlobeCollisions(firstPhase, fullConfig);
  let worstGlobePhase = firstPhase;

  // Iterate over remaining phases
  for (let i = 1; i < phases.length; i++) {
    const phase = phases[i];
    const particleResult = checkParticleCollisions(phase, fullConfig);
    const globeResult = checkGlobeCollisions(phase, fullConfig);

    // Track worst particle collision (smallest min distance)
    if (particleResult.minParticleDistance < worstParticle.minParticleDistance) {
      worstParticle = particleResult;
      worstParticlePhase = phase;
    }

    // Track worst globe collision (smallest surface distance)
    if (globeResult.minSurfaceDistance < worstGlobe.minSurfaceDistance) {
      worstGlobe = globeResult;
      worstGlobePhase = phase;
    }
  }

  return {
    particle: { ...worstParticle, worstPhase: worstParticlePhase },
    globe: { ...worstGlobe, worstPhase: worstGlobePhase },
    phases,
    config: fullConfig,
  };
}

/**
 * Test at multiple time points to catch collision at worst ambient/wobble alignment
 */
export function runTimeVaryingCollisionTest(
  breathPhase: number,
  config: Partial<CollisionTestConfig> = {},
  timePoints = 20,
): { worst: CollisionResult; worstTime: number } {
  const fullConfig: CollisionTestConfig = { ...DEFAULT_CONFIG, ...config };

  // Test across one wobble period (based on PERPENDICULAR_FREQUENCY = 0.35 Hz)
  const wobblePeriod = 1 / PERPENDICULAR_FREQUENCY;

  // Initialize with first time point
  const firstTime = 0;
  let worstResult = checkParticleCollisions(breathPhase, { ...fullConfig, time: firstTime });
  let worstTime = firstTime;

  // Iterate over remaining time points
  for (let i = 1; i < timePoints; i++) {
    const time = (i / timePoints) * wobblePeriod;
    const result = checkParticleCollisions(breathPhase, { ...fullConfig, time });

    if (result.minParticleDistance < worstResult.minParticleDistance) {
      worstResult = result;
      worstTime = time;
    }
  }

  return { worst: worstResult, worstTime };
}

/**
 * Surface distance verification result
 */
export interface SurfaceDistanceResult {
  /** Average distance from particle centers to globe surface */
  avgSurfaceDistance: number;
  /** Expected surface distance for this breath phase */
  expectedSurfaceDistance: number;
  /** Ratio of actual to expected (should be close to 1.0) */
  ratio: number;
  /** Whether particles are within expected distance (within 20% tolerance) */
  withinTolerance: boolean;
  /** Globe radius used in calculation */
  globeRadius: number;
}

/**
 * Verify that particles are at the expected distance from globe surface.
 * Uses the centralized config to determine expected distances.
 *
 * @param breathPhase 0 = exhaled (far), 1 = inhaled (close)
 * @param config Particle configuration
 * @param tolerance How much deviation is acceptable (default 0.2 = 20%)
 */
export function verifySurfaceDistance(
  breathPhase: number,
  config: Partial<CollisionTestConfig> = {},
  tolerance = 0.2,
): SurfaceDistanceResult {
  const fullConfig: CollisionTestConfig = { ...DEFAULT_CONFIG, ...config };
  const positions = calculateAllParticlePositions(breathPhase, fullConfig);
  const { globeRadius } = fullConfig;

  // Calculate average distance from globe center
  const avgCenterDistance = positions.reduce((sum, p) => sum + p.length(), 0) / positions.length;

  // Surface distance = center distance - globe radius
  const avgSurfaceDistance = avgCenterDistance - globeRadius;

  // Expected surface distance from centralized config
  const expectedSurfaceDistance = calculateExpectedSurfaceDistance(breathPhase);

  const ratio = avgSurfaceDistance / expectedSurfaceDistance;
  const withinTolerance = Math.abs(ratio - 1.0) <= tolerance;

  return {
    avgSurfaceDistance,
    expectedSurfaceDistance,
    ratio,
    withinTolerance,
    globeRadius,
  };
}

/**
 * Keplerian velocity calculation result
 */
export interface KeplerianVelocityResult {
  /** Final velocity after applying Keplerian physics */
  velocity: number;
  /** Raw Keplerian factor before clamping */
  keplerianFactor: number;
  /** Velocity ratio relative to reference radius */
  velocityRatio: number;
  /** Whether velocity was clamped to min/max bounds */
  wasClamped: boolean;
  /** Effective gravitational mass (affected by breath phase) */
  effectiveGM: number;
}

/**
 * Calculate Keplerian orbital velocity for a given radius and breath phase.
 *
 * Implements simplified Kepler's Law: v = √(GM/r)
 * - Closer to globe (smaller r) → faster velocity
 * - Farther from globe (larger r) → slower velocity
 *
 * Additionally modulates "apparent mass" with breath phase:
 * - During inhale (breathPhase=1): mass increases → stronger gravitational pull → faster
 * - During exhale (breathPhase=0): mass decreases → weaker pull → slower
 *
 * @param currentRadius Distance from globe center
 * @param breathPhaseValue 0 = exhaled, 1 = inhaled
 * @param baseSpeed Base orbital speed before Keplerian adjustment
 * @returns Detailed velocity calculation result
 */
export function calculateKeplerianVelocity(
  currentRadius: number,
  breathPhaseValue: number,
  baseSpeed: number,
): KeplerianVelocityResult {
  const {
    BASE_GM,
    REFERENCE_RADIUS,
    BREATH_MASS_MODULATION,
    MIN_VELOCITY_FACTOR,
    MAX_VELOCITY_FACTOR,
  } = KEPLERIAN_CONFIG;

  // Modulate apparent mass with breath phase
  // During inhale (high breathPhase): mass increases → stronger gravitational pull
  // During exhale (low breathPhase): mass decreases → weaker pull
  const massModulation = 1 + BREATH_MASS_MODULATION * (breathPhaseValue * 2 - 1);
  const effectiveGM = BASE_GM * massModulation;

  // Keplerian velocity: v = √(GM/r)
  // Normalized so that at REFERENCE_RADIUS, velocity = baseSpeed
  const keplerianFactor = Math.sqrt(effectiveGM / currentRadius);
  const referenceFactor = Math.sqrt(BASE_GM / REFERENCE_RADIUS);

  // Velocity ratio relative to reference
  const velocityRatio = keplerianFactor / referenceFactor;

  // Clamp to prevent extreme velocities
  const clampedRatio = Math.max(MIN_VELOCITY_FACTOR, Math.min(MAX_VELOCITY_FACTOR, velocityRatio));
  const wasClamped = clampedRatio !== velocityRatio;

  return {
    velocity: baseSpeed * clampedRatio,
    keplerianFactor,
    velocityRatio,
    wasClamped,
    effectiveGM,
  };
}

// Re-export for tests
export {
  calculateExpectedSurfaceDistance,
  GLOBE_CONFIG,
  KEPLERIAN_CONFIG,
  PARTICLE_ORBIT_CONFIG,
} from '../config/particlePhysics';
