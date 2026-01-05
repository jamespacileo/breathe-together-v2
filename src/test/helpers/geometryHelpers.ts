/**
 * Geometry Test Helpers
 *
 * Shared utilities for testing particle distribution, collision detection,
 * and spherical geometry calculations.
 */

import type * as THREE from 'three';

/**
 * Calculate angular distance between two points on a sphere (in radians)
 *
 * INVARIANT: Distance is always in range [0, π]
 */
export function angularDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  // Normalize vectors to unit sphere
  const aNorm = a.clone().normalize();
  const bNorm = b.clone().normalize();
  // Clamp dot product to avoid NaN from floating point errors
  const dot = Math.max(-1, Math.min(1, aNorm.dot(bNorm)));
  return Math.acos(dot);
}

/**
 * Find nearest neighbor angular distance for each particle
 *
 * Returns array where index i contains the minimum angular distance
 * from particle i to any other particle.
 */
export function findNearestNeighborDistances(positions: THREE.Vector3[]): number[] {
  const distances: number[] = [];

  for (let i = 0; i < positions.length; i++) {
    let minDist = Infinity;
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      const dist = angularDistance(positions[i], positions[j]);
      if (dist < minDist) {
        minDist = dist;
      }
    }
    distances.push(minDist);
  }

  return distances;
}

/**
 * Calculate coefficient of variation (CV = std / mean)
 *
 * Lower CV means more uniform distribution.
 * CV = 0 means perfectly uniform (all values equal).
 *
 * INVARIANT: CV >= 0
 */
export function coefficientOfVariation(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Avoid division by zero
  return mean === 0 ? 0 : stdDev / mean;
}

/**
 * Calculate theoretical optimal nearest-neighbor distance for N points on sphere
 *
 * Based on the covering radius formula for optimal spherical codes.
 * For large N, optimal packing gives approximately sqrt(4π/N) radians.
 */
export function theoreticalOptimalDistance(n: number): number {
  return Math.sqrt((4 * Math.PI) / n);
}

/**
 * Check if a point lies on the unit sphere (within tolerance)
 */
export function isOnUnitSphere(point: THREE.Vector3, tolerance = 0.001): boolean {
  const distance = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
  return Math.abs(distance - 1) < tolerance;
}

/**
 * Calculate the solid angle (spherical area) of a spherical cap
 *
 * Used for Voronoi area calculations on a sphere.
 * Returns area in steradians.
 */
export function sphericalCapArea(height: number, radius = 1): number {
  return 2 * Math.PI * radius * height;
}

/**
 * Validate that all points in array lie on unit sphere
 */
export function allPointsOnUnitSphere(points: THREE.Vector3[], tolerance = 0.001): boolean {
  return points.every((p) => isOnUnitSphere(p, tolerance));
}
