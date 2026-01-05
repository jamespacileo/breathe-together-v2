/**
 * Breathing Synchronization Nodes
 *
 * All animations in this app sync to the global 4-7-8 breathing cycle.
 * These nodes provide consistent breathing modulation for:
 *
 * - Luminosity pulses (materials brighten during inhale)
 * - Scale pulsing (objects expand/contract with breath)
 * - Opacity breathing (elements fade in/out)
 * - Color transitions (hue shifts during breath phases)
 *
 * The breathing phase (0-1) is derived from UTC time in breathCalc.ts,
 * ensuring all users worldwide see synchronized animations.
 */

import { add, float, mix, mul, type ShaderNodeObject, smoothstep } from 'three/tsl';
import type { Node } from 'three/webgpu';

/**
 * Generic breath phase type that accepts any TSL uniform node
 * TSL uniforms have complex nested types, so we use a broad type
 */
// biome-ignore lint/suspicious/noExplicitAny: TSL uniform types are complex and nested - using any for flexibility
type BreathPhaseNode = ShaderNodeObject<any>;

/**
 * Luminosity breathing - material brightness pulse
 *
 * Formula: 1.0 + breathPhase * intensity
 *
 * Multiply this with your base color for subtle brightness animation.
 *
 * @param breathPhase Uniform node containing breath phase (0-1)
 * @param intensity How much brighter at peak (0.06 = +6%, 0.12 = +12%)
 * @returns Multiplier node (1.0 at exhale, 1.0+intensity at inhale)
 *
 * @example
 * ```ts
 * const uBreathPhase = uniform(float(0));
 * const luminosity = createBreathingLuminosityNode(uBreathPhase, 0.12);
 * const litColor = mul(baseColor, luminosity);
 * ```
 */
export function createBreathingLuminosityNode(
  breathPhase: BreathPhaseNode,
  intensity = 0.12,
): ShaderNodeObject<Node> {
  return add(float(1.0), mul(breathPhase, float(intensity)));
}

/**
 * Breathing pulse - oscillating value centered around 1.0
 *
 * Formula: 1.0 + breathPhase * amplitude
 *
 * Similar to luminosity but semantically for scale/size animations.
 *
 * @param breathPhase Uniform node containing breath phase (0-1)
 * @param amplitude Peak deviation from 1.0
 * @returns Pulse multiplier node
 */
export function createBreathingPulseNode(
  breathPhase: BreathPhaseNode,
  amplitude = 0.2,
): ShaderNodeObject<Node> {
  return add(float(1.0), mul(breathPhase, float(amplitude)));
}

/**
 * Breathing opacity - fade in/out with breath
 *
 * @param breathPhase Uniform node containing breath phase (0-1)
 * @param minOpacity Opacity at exhale (0-1)
 * @param maxOpacity Opacity at inhale (0-1)
 * @returns Opacity value node
 */
export function createBreathingOpacityNode(
  breathPhase: BreathPhaseNode,
  minOpacity = 0.6,
  maxOpacity = 1.0,
): ShaderNodeObject<Node> {
  return mix(float(minOpacity), float(maxOpacity), breathPhase);
}

/**
 * Smooth breathing transition - eased breathing for smoother animations
 *
 * Uses smoothstep for non-linear interpolation, creating more natural
 * ease-in/ease-out breathing motion.
 *
 * @param breathPhase Uniform node containing breath phase (0-1)
 * @param edge0 Start of smooth transition (0-1)
 * @param edge1 End of smooth transition (0-1)
 * @returns Smoothed breath phase node
 */
export function createSmoothBreathingNode(
  breathPhase: BreathPhaseNode,
  edge0 = 0.0,
  edge1 = 1.0,
): ShaderNodeObject<Node> {
  return smoothstep(float(edge0), float(edge1), breathPhase);
}

/**
 * Inner glow breathing - subtle glow that intensifies during inhale
 *
 * Used for frosted glass inner glow effect.
 *
 * @param breathPhase Uniform node containing breath phase (0-1)
 * @param baseIntensity Base glow strength
 * @param breathBoost Additional glow at peak breath
 * @returns Inner glow intensity node
 */
export function createInnerGlowBreathingNode(
  breathPhase: BreathPhaseNode,
  baseIntensity = 0.05,
  breathBoost = 0.3,
): ShaderNodeObject<Node> {
  const breathFactor = add(float(1.0), mul(breathPhase, float(breathBoost)));
  return mul(float(baseIntensity), breathFactor);
}

/**
 * Preset breathing configurations for different visual effects
 */
export const BREATHING_PRESETS = {
  /** Subtle luminosity for materials */
  subtle: { intensity: 0.06 },
  /** Standard breathing for particles */
  standard: { intensity: 0.12 },
  /** Pronounced breathing for accent elements */
  pronounced: { intensity: 0.2 },
  /** Inner glow configuration */
  innerGlow: { baseIntensity: 0.05, breathBoost: 0.3 },
} as const;

/**
 * Creates a uniform for breath phase with proper typing
 *
 * @param initialValue Starting breath phase (0-1)
 * @returns Object with uniform and update function
 */
export function createBreathPhaseUniform(initialValue = 0) {
  // Import at call time to avoid circular dependencies
  const { uniform, float: tslFloat } = require('three/tsl');
  const uBreathPhase = uniform(tslFloat(initialValue));

  return {
    uniform: uBreathPhase,
    setValue: (value: number) => {
      // biome-ignore lint/suspicious/noExplicitAny: TSL uniform.value accepts number at runtime
      (uBreathPhase as any).value = value;
    },
  };
}
