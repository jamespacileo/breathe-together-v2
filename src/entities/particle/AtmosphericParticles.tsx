/**
 * AtmosphericParticles - Ambient floating particles
 *
 * NOTE: Temporarily disabled - drei Sparkles uses ShaderMaterial which is
 * incompatible with WebGPU NodeMaterial system.
 *
 * TODO: Create TSL-based particle system for WebGPU compatibility
 *
 * Features (when re-enabled):
 * - Floating particles distributed around the scene
 * - Breathing-synchronized opacity
 * - Warm gray color (#8c7b6c) for Monument Valley aesthetic
 */

import { memo } from 'react';

export interface AtmosphericParticlesProps {
  /**
   * Number of floating particles.
   *
   * @default 100
   * @min 10
   * @max 500
   */
  count?: number;

  /**
   * Base particle size.
   *
   * @default 0.08
   * @min 0.01
   * @max 0.5
   */
  size?: number;

  /**
   * Base opacity (before breathing modulation).
   *
   * @default 0.1
   * @min 0
   * @max 1
   */
  baseOpacity?: number;

  /**
   * Breathing opacity range (added to baseOpacity).
   *
   * @default 0.15
   * @min 0
   * @max 1
   */
  breathingOpacity?: number;

  /**
   * Particle color (hex string).
   *
   * @default '#8c7b6c'
   */
  color?: string;

  /**
   * Enable/disable the component.
   *
   * @default true
   */
  enabled?: boolean;
}

/**
 * AtmosphericParticles - Floating ambient particles
 *
 * NOTE: Temporarily returns null - drei Sparkles uses ShaderMaterial
 * which is incompatible with WebGPU's NodeMaterial system.
 *
 * TODO: Implement TSL-based particle system using PointsNodeMaterial
 */
export const AtmosphericParticles = memo(function AtmosphericParticlesComponent(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _props: AtmosphericParticlesProps = {},
) {
  // TODO: Implement TSL-based particles for WebGPU compatibility
  // drei Sparkles internally uses ShaderMaterial which throws:
  // "NodeMaterial: Material 'ShaderMaterial' is not compatible"
  return null;
});
