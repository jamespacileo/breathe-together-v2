/**
 * AtmosphericParticles - Ambient floating particles using drei Sparkles
 *
 * Features:
 * - Floating particles distributed around the scene
 * - Breathing-synchronized opacity and scale
 * - Gentle swaying motion for organic feel
 * - Warm gray color (#8c7b6c) for Monument Valley aesthetic
 *
 * Replaces custom THREE.Points implementation with drei for simpler lifecycle
 */

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef } from 'react';
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
   * Scale breathing range (particles contract on inhale, expand on exhale).
   *
   * @default 0.15
   * @min 0
   * @max 0.5
   */
  scaleBreathingRange?: number;
}

/**
 * AtmosphericParticles - Floating ambient particles
 *
 * Creates an ethereal swarm of floating particles distributed around
 * the central globe. Uses drei Sparkles for automatic lifecycle management
 * with breathing-synchronized opacity, scale, and gentle swaying motion.
 */
export function AtmosphericParticles({
  count = 100,
  size = 0.08,
  baseOpacity = 0.1,
  breathingOpacity = 0.15,
  scaleBreathingRange = 0.15,
}: AtmosphericParticlesProps = {}) {
  const sparklesRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();

  // Update opacity, scale, and rotation based on breathing phase
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Get breath phase with error handling for ECS stale world
    let phase = 0.5;
    try {
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (breathEntity) {
        phase = breathEntity.get?.(breathPhase)?.value ?? 0.5;
      }
    } catch {
      // Silently catch ECS errors during unmount/remount
    }

    // Update sparkles opacity
    if (sparklesRef.current) {
      const material = sparklesRef.current.material as THREE.PointsMaterial;
      if (material.opacity !== undefined) {
        material.opacity = baseOpacity + phase * breathingOpacity;
      }
    }

    // Update group scale and rotation for breathing + gentle sway
    if (groupRef.current) {
      // Particles contract on inhale (1), expand on exhale (0)
      // Creates a "pulling inward" effect during inhale
      const breathScale = 1.0 + (1 - phase) * scaleBreathingRange;
      groupRef.current.scale.setScalar(breathScale);

      // Gentle swaying rotation for organic feel
      groupRef.current.rotation.y = Math.sin(t * 0.08) * 0.15;
      groupRef.current.rotation.x = Math.cos(t * 0.06) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <Sparkles
        ref={sparklesRef}
        count={count}
        scale={12}
        size={size}
        speed={0.5}
        opacity={baseOpacity}
        color="#8c7b6c"
      />
    </group>
  );
}
