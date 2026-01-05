/**
 * Collision Test Helpers
 *
 * Shared utilities for testing collision detection in particle systems.
 */

import { expect } from 'vitest';
import type { CollisionResult, CollisionTestConfig } from '../../lib/collisionGeometry';
import { checkGlobeCollisions, checkParticleCollisions } from '../../lib/collisionGeometry';

/**
 * Assert that no particle-particle collisions occur at given breath phase
 *
 * OUTCOME: Validates that particles maintain proper spacing for clean visuals
 */
export function expectNoParticleCollisions(
  breathPhase: number,
  config?: Partial<CollisionTestConfig>,
): void {
  const result = checkParticleCollisions(breathPhase, config);

  expect(result.hasCollision).toBe(false);
  expect(result.minParticleDistance).toBeGreaterThanOrEqual(result.requiredMinDistance);

  // If collision detected, provide detailed failure message
  if (result.hasCollision) {
    const msg = [
      `Particle collision detected at breathPhase=${breathPhase}:`,
      `  Min distance: ${result.minParticleDistance.toFixed(4)}`,
      `  Required: ${result.requiredMinDistance.toFixed(4)}`,
      `  Overlap: ${result.overlapAmount.toFixed(4)}`,
      `  Pair: ${result.minDistancePair?.join(', ')}`,
    ].join('\n');
    throw new Error(msg);
  }
}

/**
 * Assert that no globe collisions occur at given breath phase
 *
 * OUTCOME: Validates that particles don't intersect with central globe
 */
export function expectNoGlobeCollisions(
  breathPhase: number,
  config?: Partial<CollisionTestConfig>,
): void {
  const result = checkGlobeCollisions(breathPhase, config);

  expect(result.hasCollision).toBe(false);

  // If collision detected, provide detailed failure message
  if (result.hasCollision) {
    const msg = [
      `Globe collision detected at breathPhase=${breathPhase}:`,
      `  Closest particle index: ${result.closestParticleIndex}`,
      `  Min surface distance: ${result.minSurfaceDistance.toFixed(4)}`,
      `  Overlap: ${result.overlapAmount.toFixed(4)}`,
    ].join('\n');
    throw new Error(msg);
  }
}

/**
 * Assert that collision result is valid (has required properties)
 */
export function expectValidCollisionResult(result: CollisionResult): void {
  expect(result).toHaveProperty('hasCollision');
  expect(result).toHaveProperty('minParticleDistance');
  expect(result).toHaveProperty('requiredMinDistance');
  expect(typeof result.hasCollision).toBe('boolean');
  expect(typeof result.minParticleDistance).toBe('number');
  expect(typeof result.requiredMinDistance).toBe('number');

  // INVARIANT: Distances are always non-negative
  expect(result.minParticleDistance).toBeGreaterThanOrEqual(0);
  expect(result.requiredMinDistance).toBeGreaterThanOrEqual(0);
}
