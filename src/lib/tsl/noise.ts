/**
 * Noise Nodes
 *
 * TSL implementations of noise functions for procedural effects:
 * - Background gradient variation
 * - Mist animation
 * - Particle wind turbulence
 *
 * Note: TSL has built-in noise support in newer versions, but we provide
 * these implementations for fine-grained control and backward compatibility.
 */

import {
  add,
  dot,
  float,
  floor,
  fract,
  mix,
  mul,
  type ShaderNodeObject,
  sin,
  sub,
  vec2,
  type vec3,
} from 'three/tsl';
import type { Node } from 'three/webgpu';

/**
 * Simple hash function for pseudo-random values
 *
 * Converts a 2D coordinate to a pseudo-random value.
 *
 * @param p 2D position
 * @returns Pseudo-random value (0-1)
 */
export function createHashNode(p: ShaderNodeObject<Node>): ShaderNodeObject<Node> {
  // hash(p) = fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453)
  const dotProduct = dot(p, vec2(127.1, 311.7));
  const sinValue = sin(dotProduct);
  return fract(mul(sinValue, float(43758.5453)));
}

/**
 * 2D value noise
 *
 * Smooth noise interpolated from grid of random values.
 *
 * @param p 2D position
 * @returns Noise value (0-1)
 */
export function createValueNoiseNode(p: ShaderNodeObject<Node>): ShaderNodeObject<Node> {
  // Integer and fractional parts
  const i = floor(p);
  const f = fract(p);

  // Smooth interpolation curve: f * f * (3.0 - 2.0 * f)
  const u = mul(mul(f, f), sub(vec2(3.0, 3.0), mul(vec2(2.0, 2.0), f)));

  // Sample four corners
  const a = createHashNode(i);
  const b = createHashNode(add(i, vec2(1.0, 0.0)));
  const c = createHashNode(add(i, vec2(0.0, 1.0)));
  const d = createHashNode(add(i, vec2(1.0, 1.0)));

  // Bilinear interpolation - access vec2 components via swizzle
  // TSL vec components are accessible as properties
  const uVec = u as ReturnType<typeof vec2>;
  const mixAB = mix(a, b, uVec.x);
  const mixCD = mix(c, d, uVec.x);
  return mix(mixAB, mixCD, uVec.y);
}

/**
 * Fractal Brownian Motion (FBM) noise
 *
 * Layered noise at different frequencies for natural-looking variation.
 * Used for clouds, terrain, organic textures.
 *
 * @param p 2D position
 * @param octaves Number of noise layers (more = more detail, slower)
 * @param lacunarity Frequency multiplier per octave (typically 2.0)
 * @param gain Amplitude multiplier per octave (typically 0.5)
 * @returns FBM noise value
 *
 * @example
 * ```ts
 * // 2-octave FBM for subtle background variation
 * const noise = createFBMNode(uv, 2, 2.0, 0.5);
 * const color = add(baseColor, mul(noise, 0.02)); // +/-2% variation
 * ```
 */
export function createFBMNode(
  p: ShaderNodeObject<Node>,
  octaves = 2,
  lacunarity = 2.0,
  gain = 0.5,
): ShaderNodeObject<Node> {
  let value = float(0.0);
  let amplitude = float(1.0);
  let frequency = float(1.0);
  const pos = p;

  for (let i = 0; i < octaves; i++) {
    const scaledPos = mul(pos, frequency);
    const noiseValue = createValueNoiseNode(scaledPos);
    value = add(value, mul(amplitude, noiseValue));

    frequency = mul(frequency, float(lacunarity));
    amplitude = mul(amplitude, float(gain));
  }

  return value;
}

/**
 * Animated noise - noise that evolves over time
 *
 * @param p 2D position
 * @param time Time uniform
 * @param speed Animation speed
 * @returns Time-varying noise value
 */
export function createAnimatedNoiseNode(
  p: ShaderNodeObject<Node>,
  time: ShaderNodeObject<Node>,
  speed = 0.1,
): ShaderNodeObject<Node> {
  const animatedPos = add(p, mul(time, float(speed)));
  return createValueNoiseNode(animatedPos);
}

/**
 * 3D simplex noise approximation
 *
 * Note: This is a simplified implementation. For production use with
 * complex 3D noise, consider using Three.js built-in noise when available.
 *
 * @param p 3D position
 * @returns Noise value (-1 to 1)
 */
export function createSimplexNoise3DNode(p: ShaderNodeObject<Node>): ShaderNodeObject<Node> {
  // Simplified 3D noise using multiple 2D samples
  // Access vec3 components via type assertion
  const pVec = p as ReturnType<typeof vec3>;
  const xy = vec2(pVec.x, pVec.y);
  const yz = vec2(pVec.y, pVec.z);
  const xz = vec2(pVec.x, pVec.z);

  const n1 = createValueNoiseNode(xy);
  const n2 = createValueNoiseNode(yz);
  const n3 = createValueNoiseNode(xz);

  // Average and remap to -1 to 1
  const avg = mul(add(add(n1, n2), n3), float(1.0 / 3.0));
  return sub(mul(avg, float(2.0)), float(1.0));
}

/**
 * Noise presets for common use cases
 */
export const NOISE_PRESETS = {
  /** Subtle background variation */
  backgroundVariation: {
    octaves: 2,
    lacunarity: 2.0,
    gain: 0.5,
    scale: 3.0,
    intensity: 0.02,
  },
  /** Mist/fog animation */
  mist: {
    octaves: 3,
    lacunarity: 2.0,
    gain: 0.5,
    scale: 2.0,
    speed: 0.05,
  },
  /** Wind turbulence */
  wind: {
    octaves: 2,
    lacunarity: 1.8,
    gain: 0.6,
    scale: 1.5,
    speed: 0.1,
  },
} as const;
