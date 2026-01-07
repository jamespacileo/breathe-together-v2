/**
 * Instancing Utilities for TSL
 *
 * Provides access to per-instance attributes in TSL (Three.js Shading Language) shaders.
 * Used for instanced rendering where each instance has unique data (color, opacity, etc.).
 *
 * This enables efficient rendering of thousands of objects (particles, shards, etc.)
 * with individual properties, using a single draw call.
 *
 * ## Usage Example
 *
 * ```typescript
 * // In your component, create an InstancedMesh with custom attributes
 * const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
 * instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 *
 * // Add per-instance attributes
 * const opacities = new Float32Array(count);
 * for (let i = 0; i < count; i++) {
 *   opacities[i] = Math.random();
 * }
 * instancedMesh.geometry.setAttribute(
 *   'aOpacity',
 *   new THREE.InstancedBufferAttribute(opacities, 1)
 * );
 *
 * // In your TSL material, access the per-instance opacity
 * const opacity = createInstanceAttributeNode('aOpacity');
 * material.opacityNode = mul(baseOpacity, opacity);
 * ```
 *
 * ## Three.js Instancing Background
 *
 * **InstancedMesh** allows rendering many copies of the same geometry/material
 * with different transforms and attributes in a single draw call.
 *
 * Benefits:
 * - **Performance**: 1 draw call instead of N draw calls
 * - **Memory**: Shared geometry/material
 * - **Flexibility**: Per-instance data (position, rotation, scale, custom attributes)
 *
 * Use cases:
 * - Particle systems (thousands of particles)
 * - Vegetation (trees, grass)
 * - Crowds (characters)
 * - Debris (shards, fragments)
 */

import { attribute, type ShaderNodeObject } from 'three/tsl';
import type { Node } from 'three/webgpu';

/**
 * Access per-instance attribute in TSL shaders
 *
 * Wraps three/tsl's `attribute()` function to reference per-instance buffer attributes
 * attached to InstancedMesh geometries.
 *
 * @param attributeName Name of the instanced buffer attribute (e.g., 'aOpacity', 'aSparklePhase')
 * @returns TSL node that reads the per-instance value for the current instance
 *
 * @example
 * ```typescript
 * // In your component, attach instance attributes to the geometry
 * mesh.geometry.setAttribute(
 *   'aOpacity',
 *   new THREE.InstancedBufferAttribute(opacities, 1)
 * );
 *
 * // In your TSL material, access the per-instance opacity
 * const opacity = createInstanceAttributeNode('aOpacity');
 *
 * // Access per-particle sparkle phase offset
 * const sparklePhase = createInstanceAttributeNode('aSparklePhase');
 *
 * // Use in material
 * const mat = new MeshBasicNodeMaterial();
 * mat.opacityNode = mul(baseOpacity, opacity);
 * ```
 */
export function createInstanceAttributeNode(attributeName: string): ShaderNodeObject<Node> {
  return attribute(attributeName);
}

/**
 * Common instance attribute names used in breathe-together-v2
 *
 * This enum provides type-safe attribute names for commonly used
 * per-instance data across the application.
 */
export const INSTANCE_ATTRIBUTES = {
  /** Per-instance opacity (0-1) */
  OPACITY: 'aOpacity',

  /** Per-instance sparkle phase offset (radians or 0-1) */
  SPARKLE_PHASE: 'aSparklePhase',

  /** Per-instance color (RGB vec3) */
  COLOR: 'aColor',

  /** Per-instance scale multiplier */
  SCALE: 'aScale',

  /** Per-instance rotation offset */
  ROTATION: 'aRotation',
} as const;
