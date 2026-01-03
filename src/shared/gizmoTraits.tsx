/**
 * Shape Gizmo Traits
 *
 * Traits for storing shape metadata (centroids, bounds, orientation) that can be
 * queried by the gizmo visualization system and reused for positioning/anchoring
 * other elements, effects, or UI components.
 *
 * Usage:
 * - Register shapes with the ECS world on mount
 * - Query traits to get real-time centroid/bounds data
 * - Use for anchoring effects, tooltips, or other elements to shapes
 */
import { trait } from 'koota';
import type * as THREE from 'three';

/**
 * Shape types that can have gizmos
 */
export type ShapeType = 'globe' | 'swarm' | 'shard';

/**
 * Shape centroid trait - stores the center position of a shape
 *
 * Consumed by: ShapeGizmos (debug visualization), future anchoring systems
 */
export const shapeCentroid = trait({
  /** Shape identifier */
  shapeId: '' as string,
  /** Type of shape for filtering */
  shapeType: 'globe' as ShapeType,
  /** X coordinate of centroid (world space) */
  x: 0,
  /** Y coordinate of centroid (world space) */
  y: 0,
  /** Z coordinate of centroid (world space) */
  z: 0,
});

/**
 * Shape bounds trait - stores bounding sphere radius
 *
 * Consumed by: ShapeGizmos (debug visualization), collision detection
 */
export const shapeBounds = trait({
  /** Shape identifier (matches shapeCentroid.shapeId) */
  shapeId: '' as string,
  /** Bounding sphere radius */
  radius: 1,
  /** Inner radius (for hollow shapes like swarm) */
  innerRadius: 0,
});

/**
 * Shape orientation trait - stores rotation/orientation
 *
 * Consumed by: ShapeGizmos (axis visualization), aligned effects
 */
export const shapeOrientation = trait({
  /** Shape identifier */
  shapeId: '' as string,
  /** Euler rotation X (radians) */
  rotationX: 0,
  /** Euler rotation Y (radians) */
  rotationY: 0,
  /** Euler rotation Z (radians) */
  rotationZ: 0,
});

/**
 * Helper to create a Vector3 from centroid trait data
 */
export function centroidToVector3(
  centroid: { x: number; y: number; z: number },
  target?: THREE.Vector3,
): THREE.Vector3 {
  if (target) {
    return target.set(centroid.x, centroid.y, centroid.z);
  }
  // Return a plain object that can be spread into Vector3 constructor
  return { x: centroid.x, y: centroid.y, z: centroid.z } as unknown as THREE.Vector3;
}
