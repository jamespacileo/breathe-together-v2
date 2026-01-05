/**
 * Gradient Nodes
 *
 * Utility nodes for creating smooth color gradients used in:
 * - Background gradient (sky gradient with multiple stops)
 * - Light ray fadeout
 * - Atmosphere color transitions
 */

import { color, float, mix, type ShaderNodeObject, smoothstep } from 'three/tsl';
import type { Node } from 'three/webgpu';

/**
 * Two-color linear gradient
 *
 * @param colorA Start color (bottom)
 * @param colorB End color (top)
 * @param t Interpolation factor (0-1)
 * @returns Interpolated color node
 */
export function createLinearGradientNode(
  colorA: string,
  colorB: string,
  t: ShaderNodeObject<Node>,
): ShaderNodeObject<Node> {
  return mix(color(colorA), color(colorB), t);
}

/**
 * Smooth gradient with eased transitions
 *
 * @param colorA Start color
 * @param colorB End color
 * @param t Interpolation factor (0-1)
 * @param edge0 Start of smooth transition
 * @param edge1 End of smooth transition
 * @returns Smoothly interpolated color node
 */
export function createSmoothGradientNode(
  colorA: string,
  colorB: string,
  t: ShaderNodeObject<Node>,
  edge0 = 0.0,
  edge1 = 1.0,
): ShaderNodeObject<Node> {
  const smoothT = smoothstep(float(edge0), float(edge1), t);
  return mix(color(colorA), color(colorB), smoothT);
}

/**
 * Multi-stop gradient for complex sky/background effects
 *
 * Creates a gradient with multiple color stops, like:
 * - Bottom: warm cream
 * - Lower-mid: soft peach
 * - Upper-mid: muted lavender
 * - Top: pale sky blue
 *
 * @param stops Array of {color, position} where position is 0-1
 * @param t Vertical position (0 = bottom, 1 = top)
 * @returns Color node at position t
 */
export function createMultiStopGradientNode(
  stops: Array<{ color: string; position: number }>,
  t: ShaderNodeObject<Node>,
) {
  if (stops.length < 2) {
    return color(stops[0]?.color || '#ffffff');
  }

  // Sort stops by position
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);

  // Build gradient by reducing stops
  // Use type-safe reduction pattern
  return sortedStops.slice(1).reduce(
    (result, currStop, index) => {
      const prevStop = sortedStops[index];
      // Smooth transition between stops
      const localT = smoothstep(float(prevStop.position), float(currStop.position), t);
      return mix(result, color(currStop.color), localT);
    },
    color(sortedStops[0].color) as ShaderNodeObject<Node>,
  );
}

/**
 * Radial gradient from center
 *
 * @param centerColor Color at center
 * @param edgeColor Color at edges
 * @param uv UV coordinates (0-1)
 * @param falloff Controls gradient curve (1 = linear, 2 = quadratic)
 * @returns Color node based on distance from center
 */
export function createRadialGradientNode(
  centerColor: string,
  edgeColor: string,
  distance: ShaderNodeObject<Node>,
  falloff = 1.0,
): ShaderNodeObject<Node> {
  const { pow } = require('three/tsl');
  const t = pow(distance, float(falloff));
  return mix(color(centerColor), color(edgeColor), t);
}

/**
 * Monument Valley palette gradient stops
 *
 * Pre-configured gradient for the app's signature sky look.
 */
export const MONUMENT_VALLEY_GRADIENT = [
  { color: '#faf8f5', position: 0.0 }, // Warm white (bottom)
  { color: '#f5ebe0', position: 0.25 }, // Soft cream
  { color: '#efe5da', position: 0.5 }, // Warm beige
  { color: '#e8ddd5', position: 0.75 }, // Muted lavender
  { color: '#f0e6e0', position: 1.0 }, // Pale pink-white (top)
] as const;

/**
 * Vignette effect - darkens edges
 *
 * @param uv UV coordinates centered at (0.5, 0.5)
 * @param intensity Darkening amount (0-1)
 * @param softness Edge softness (higher = softer)
 * @returns Vignette multiplier (1 at center, darker at edges)
 */
export function createVignetteNode(
  distance: ShaderNodeObject<Node>,
  intensity = 0.15,
  softness = 0.5,
) {
  const { sub, mul } = require('three/tsl');
  const vignette = smoothstep(float(softness), float(1.0), distance);
  return sub(float(1.0), mul(vignette, float(intensity)));
}
