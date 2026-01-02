/**
 * AtmosphericParticles - Ambient floating particles using drei Sparkles
 *
 * Features:
 * - Floating particles distributed around the scene
 * - Breathing-synchronized opacity
 * - Warm gray color (#8c7b6c) for Monument Valley aesthetic
 *
 * Replaces custom THREE.Points implementation with drei for simpler lifecycle
 */

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useRef } from 'react';
import type * as THREE from 'three';
import { breathPhase } from '../breath/traits';

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
}

/**
 * AtmosphericParticles - Floating ambient particles
 *
 * Creates an ethereal swarm of floating particles distributed around
 * the central globe. Uses drei Sparkles for automatic lifecycle management
 * with breathing-synchronized opacity modulation.
 *
 * Wrapped with React.memo to prevent re-renders from parent component updates.
 */
export const AtmosphericParticles = memo(function AtmosphericParticlesComponent({
  count = 100,
  size = 0.08,
  baseOpacity = 0.1,
  breathingOpacity = 0.15,
  color = '#8c7b6c',
}: AtmosphericParticlesProps = {}) {
  const sparklesRef = useRef<THREE.Points>(null);
  // Cache material reference to avoid repeated type casting in animation loop
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const world = useWorld();

  // Update opacity based on breathing phase
  useFrame(() => {
    if (!sparklesRef.current) return;

    // Cache material on first frame to avoid repeated type assertion
    if (!materialRef.current) {
      materialRef.current = sparklesRef.current.material as THREE.PointsMaterial;
    }

    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity && materialRef.current) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      materialRef.current.opacity = baseOpacity + phase * breathingOpacity;
    }
  });

  return (
    <Sparkles
      ref={sparklesRef}
      count={count}
      scale={12}
      size={size}
      speed={0.5}
      opacity={baseOpacity}
      color={color}
    />
  );
});
