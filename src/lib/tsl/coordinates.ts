/**
 * Coordinate System Utilities for TSL
 *
 * Provides coordinate space transformations for TSL shaders, particularly
 * polar coordinate conversion for radial effects like sun rays, circular patterns,
 * and mandala-style designs.
 *
 * ## Polar Coordinates
 *
 * Polar coordinates (r, θ) are essential for creating radial symmetry:
 * - **r (radius)**: Distance from center (0 at center, increases outward)
 * - **θ (theta/angle)**: Angle in radians (-π to π, 0 points right, π/2 points up)
 *
 * Use cases:
 * - Sun/star rays radiating from center
 * - Circular gradients and halos
 * - Rotational symmetry patterns
 * - Vortex/spiral effects
 * - Radial repeating segments
 *
 * ## Usage Example
 *
 * ```typescript
 * // In your TSL material
 * const uvCoord = uv();
 *
 * // Convert to polar coordinates
 * const { r, theta } = createPolarCoordinatesNode(uvCoord);
 *
 * // Create 12 radial sun rays
 * const rayAngle = createRadialRepeatNode(theta, 12);
 *
 * // Intensity based on ray alignment
 * const rayIntensity = smoothstep(
 *   float(0.1),
 *   float(0.0),
 *   abs(sub(rayAngle, float(Math.PI / 24)))
 * );
 *
 * // Radial gradient from center
 * const gradient = sub(float(1.0), r);
 * ```
 */

import {
  add,
  atan2,
  float,
  length,
  mod,
  type ShaderNodeObject,
  smoothstep,
  sub,
  vec2,
} from 'three/tsl';
import type { Node } from 'three/webgpu';

/**
 * Result of polar coordinate conversion
 */
export interface PolarCoordinates {
  /** Distance from center (0 at center, 1 at edge for normalized UV) */
  r: ShaderNodeObject<Node>;
  /** Angle in radians (-π to π, 0 points right, increases counter-clockwise) */
  theta: ShaderNodeObject<Node>;
}

/**
 * Convert UV coordinates to polar coordinates (r, θ)
 *
 * Transforms cartesian UV space (0-1, 0-1) to polar space with center at (0.5, 0.5).
 *
 * **Coordinate System:**
 * - **r = 0**: Center of UV space (0.5, 0.5)
 * - **r = 0.707**: Corners of UV space (√2/2, maximum distance)
 * - **θ = 0**: Points right (positive X axis)
 * - **θ = π/2**: Points up (positive Y axis)
 * - **θ = π or -π**: Points left (negative X axis)
 * - **θ = -π/2**: Points down (negative Y axis)
 *
 * @param uvCoord UV coordinate node (typically from `uv()`)
 * @returns Object with r (radius) and theta (angle) nodes
 *
 * @example
 * ```typescript
 * // Create radial gradient
 * const { r, theta } = createPolarCoordinatesNode(uv());
 * const gradient = sub(float(1.0), smoothstep(float(0.0), float(0.5), r));
 * ```
 *
 * @example
 * ```typescript
 * // Create rotating animation
 * const { r, theta } = createPolarCoordinatesNode(uv());
 * const rotatedAngle = add(theta, mul(uTime, float(0.5))); // Rotate over time
 * ```
 */
export function createPolarCoordinatesNode(uvCoord: ShaderNodeObject<Node>): PolarCoordinates {
  // Center UV coordinates at (0.5, 0.5) → range becomes (-0.5, 0.5)
  const centered = sub(uvCoord, vec2(0.5, 0.5));

  // Calculate radius (distance from center)
  const r = length(centered);

  // Calculate angle using atan2(y, x)
  // atan2 returns angle in radians (-π to π)
  // Note: centered.y and centered.x extract components from vec2
  const theta = atan2(centered.y, centered.x);

  return { r, theta };
}

/**
 * Create radial repeat pattern for sun rays or mandala segments
 *
 * Takes an angle in radians and creates a repeating pattern with the specified
 * number of segments. Each segment spans (2π / segments) radians.
 *
 * **How it works:**
 * 1. Divides the full circle (2π) into `segments` equal parts
 * 2. Uses modulo to repeat the pattern within each segment
 * 3. Returns angle offset within current segment (0 to segmentAngle)
 *
 * **Common segment counts:**
 * - 4 segments: Cross/plus pattern
 * - 6 segments: Hexagonal/snowflake
 * - 8 segments: Octagonal/star
 * - 12 segments: Clock/sun rays (common for stylized sun)
 * - 16 segments: Fine radial pattern
 *
 * @param angle Angle node in radians (typically theta from polar coordinates)
 * @param segments Number of radial segments/rays (must be > 0)
 * @returns Angle offset within current segment (0 to 2π/segments)
 *
 * @example
 * ```typescript
 * // Create 12 sun rays
 * const { theta } = createPolarCoordinatesNode(uv());
 * const rayAngle = createRadialRepeatNode(theta, 12);
 *
 * // Ray intensity peaks at center of each segment (rayAngle = π/24)
 * const centerAngle = float(Math.PI / 24); // Half segment width
 * const rayIntensity = smoothstep(
 *   float(0.1),
 *   float(0.0),
 *   abs(sub(rayAngle, centerAngle))
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Create 8 radial stripes
 * const { theta } = createPolarCoordinatesNode(uv());
 * const stripeAngle = createRadialRepeatNode(theta, 8);
 *
 * // Alternate between two colors based on segment
 * const segmentIndex = floor(div(add(theta, Math.PI), float(2 * Math.PI / 8)));
 * const isEvenSegment = mod(segmentIndex, float(2.0));
 * ```
 */
export function createRadialRepeatNode(
  angle: ShaderNodeObject<Node>,
  segments: number,
): ShaderNodeObject<Node> {
  // Calculate segment angle (2π / segments)
  const segmentAngle = float((2 * Math.PI) / segments);

  // atan2 returns angle in range (-π, π)
  // Add π to shift to range (0, 2π) for cleaner modulo
  const positiveAngle = add(angle, float(Math.PI));

  // Modulo to get angle within current segment
  // Result range: (0, segmentAngle)
  const repeatedAngle = mod(positiveAngle, segmentAngle);

  return repeatedAngle;
}

/**
 * Create smooth radial gradient from center
 *
 * Convenience function for common radial gradient pattern.
 * Gradient is 1.0 at center, 0.0 at outer radius.
 *
 * @param uvCoord UV coordinate node
 * @param outerRadius Radius at which gradient reaches 0 (default: 0.5)
 * @param innerRadius Radius at which gradient starts (default: 0.0)
 * @returns Gradient intensity (1.0 at center, 0.0 at outerRadius)
 *
 * @example
 * ```typescript
 * // Sun glow that fades from center
 * const glow = createRadialGradientNode(uv(), 0.6, 0.1);
 * const sunColor = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.7, 0.3), glow);
 * ```
 */
export function createRadialGradientNode(
  uvCoord: ShaderNodeObject<Node>,
  outerRadius = 0.5,
  innerRadius = 0.0,
): ShaderNodeObject<Node> {
  const { r } = createPolarCoordinatesNode(uvCoord);

  // Smooth falloff from inner to outer radius
  const gradient = smoothstep(float(outerRadius), float(innerRadius), r);

  return gradient;
}
