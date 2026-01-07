/**
 * Fresnel Effect Nodes
 *
 * Fresnel describes how light reflects/refracts at different viewing angles.
 * At grazing angles (looking at edges), surfaces appear brighter.
 *
 * This effect is used throughout the app for:
 * - Soft rim glow on particles
 * - Atmospheric glow on the globe
 * - Light ray fadeout
 */

import {
  dot,
  float,
  normalView,
  pow,
  type ShaderNodeObject,
  sub,
  abs as tslAbs,
  max as tslMax,
} from 'three/tsl';
import type { Node } from 'three/webgpu';
import { createViewDirectionNode } from './viewDirection';

/**
 * Standard fresnel effect - brighter at edges
 *
 * Formula: pow(1.0 - max(dot(normal, viewDir), 0.0), power)
 *
 * @param power Controls edge sharpness. Higher = tighter edge glow
 *   - 2.0-2.5: Soft, diffuse glow
 *   - 3.0-3.5: Standard rim lighting
 *   - 4.0-5.0: Tight, focused edge
 *
 * @returns TSL node with value 0 (facing camera) to 1 (edge)
 *
 * @example
 * ```ts
 * // Soft frosted glass rim
 * const fresnel = createFresnelNode(2.5);
 * const rimColor = mix(baseColor, white, mul(fresnel, 0.25));
 * ```
 */
export function createFresnelNode(power = 3.0): ShaderNodeObject<Node> {
  const viewDir = createViewDirectionNode();
  return pow(sub(float(1.0), tslMax(dot(normalView, viewDir), float(0.0))), float(power));
}

/**
 * Absolute fresnel - bright at both front and back edges
 *
 * Formula: pow(1.0 - abs(dot(normal, viewDir)), power)
 *
 * Used for double-sided glow effects where back faces should also glow.
 *
 * @param power Controls edge sharpness
 * @returns TSL node with value 0 (facing camera) to 1 (edge)
 */
export function createAbsoluteFresnelNode(power = 3.5): ShaderNodeObject<Node> {
  const viewDir = createViewDirectionNode();
  return pow(sub(float(1.0), tslAbs(dot(normalView, viewDir))), float(power));
}

/**
 * Inverted fresnel - brighter when facing camera
 *
 * Formula: 1.0 - fresnel
 *
 * Used for inner glow effects that fade out at edges.
 *
 * @param power Fresnel power before inversion
 * @returns TSL node with value 1 (facing camera) to 0 (edge)
 */
export function createInvertedFresnelNode(power = 3.0): ShaderNodeObject<Node> {
  return sub(float(1.0), createFresnelNode(power));
}

/**
 * Preset fresnel configurations for common use cases
 */
export const FRESNEL_PRESETS = {
  /** Soft diffuse glow for glassy rim highlights */
  frostedGlass: { power: 2.5, intensity: 0.25 },
  /** Tight atmospheric halo - Globe glow */
  atmosphere: { power: 4.0, intensity: 0.18 },
  /** Very soft glow - Globe mist */
  mist: { power: 3.5, intensity: 0.25 },
  /** Sharp rim light */
  rimLight: { power: 5.0, intensity: 0.4 },
} as const;
