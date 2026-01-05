/**
 * View Direction Node
 *
 * Computes the normalized direction from surface to camera.
 * This is a fundamental building block for many effects like fresnel and reflections.
 */

import { cameraPosition, normalize, positionWorld, sub } from 'three/tsl';

/**
 * Creates a normalized view direction vector (surface → camera)
 *
 * Used for:
 * - Fresnel effects (edge glow based on viewing angle)
 * - Reflection calculations
 * - Rim lighting
 *
 * @returns TSL node representing normalized view direction in world space
 *
 * @example
 * ```ts
 * const viewDir = createViewDirectionNode();
 * const fresnel = pow(sub(1.0, max(dot(normalView, viewDir), 0.0)), 3.0);
 * ```
 */
export function createViewDirectionNode() {
  return normalize(sub(cameraPosition, positionWorld));
}
