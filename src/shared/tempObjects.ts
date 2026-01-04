/**
 * Pre-allocated Three.js objects for reuse in render loops
 *
 * These objects are shared across components that need temporary
 * objects for matrix decomposition, position calculations, etc.
 * Reusing these avoids garbage collection pressure from creating
 * new objects every frame.
 *
 * IMPORTANT: These are module-level singletons. Only use within
 * a single frame - values will be overwritten by other systems.
 */

import * as THREE from 'three';

// Matrix decomposition temps
export const tempMatrix = new THREE.Matrix4();
export const tempPosition = new THREE.Vector3();
export const tempQuaternion = new THREE.Quaternion();
export const tempScale = new THREE.Vector3();

// Additional position temp for when you need two positions in same calculation
export const tempPosition2 = new THREE.Vector3();

// Rotation temps
export const tempRotationMatrix = new THREE.Matrix4();
export const tempEuler = new THREE.Euler();

// Pre-computed orientations
export const ringOrientation = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(Math.PI / 2, 0, 0),
);
