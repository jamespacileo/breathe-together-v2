/**
 * AtmosphericParticles - Multi-layer ambient floating particles
 *
 * Features:
 * - THREE depth layers for parallax effect (background, midground, foreground)
 * - Breathing-synchronized opacity per layer
 * - Varying speeds and sizes create sense of depth and atmosphere
 * - Warm gray tones for Monument Valley aesthetic
 *
 * Uses drei Sparkles for automatic lifecycle management
 */

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef } from 'react';
import type * as THREE from 'three';
import { breathPhase } from '../breath/traits';

export interface AtmosphericParticlesProps {
  /**
   * Base number of floating particles (distributed across layers).
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
}

/**
 * AtmosphericParticles - Multi-layer floating ambient particles
 *
 * Creates an ethereal depth effect with THREE layers of particles:
 * - Background: Large, slow, dim (creates distance)
 * - Midground: Medium, normal speed (main particle field)
 * - Foreground: Small, fast, bright (creates intimacy)
 *
 * Each layer has breathing-synchronized opacity for cohesive feel.
 */
export function AtmosphericParticles({
  count = 100,
  size = 0.08,
  baseOpacity = 0.1,
  breathingOpacity = 0.15,
}: AtmosphericParticlesProps = {}) {
  // Refs for each layer
  const backgroundRef = useRef<THREE.Points>(null);
  const midgroundRef = useRef<THREE.Points>(null);
  const foregroundRef = useRef<THREE.Points>(null);
  const world = useWorld();

  // Helper to update layer opacity
  const updateLayerOpacity = (
    ref: React.RefObject<THREE.Points | null>,
    baseMultiplier: number,
    breathMultiplier: number,
    phase: number,
  ) => {
    if (!ref.current) return;
    const material = ref.current.material as THREE.PointsMaterial;
    if (material.opacity !== undefined) {
      material.opacity = baseOpacity * baseMultiplier + phase * breathingOpacity * breathMultiplier;
    }
  };

  // Update opacity based on breathing phase for all layers
  useFrame(() => {
    try {
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (!breathEntity) return;

      const phase = breathEntity.get?.(breathPhase)?.value ?? 0;

      // Background: Dimmer, slower breathing response
      updateLayerOpacity(backgroundRef, 0.6, 0.4, phase);
      // Midground: Normal breathing response
      updateLayerOpacity(midgroundRef, 1.0, 1.0, phase);
      // Foreground: Brighter, stronger breathing response
      updateLayerOpacity(foregroundRef, 1.2, 1.4, phase);
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  // Distribute particles across layers (50% mid, 30% back, 20% front)
  const bgCount = Math.floor(count * 0.3);
  const midCount = Math.floor(count * 0.5);
  const fgCount = Math.floor(count * 0.2);

  return (
    <group name="Atmospheric Particles">
      {/* BACKGROUND LAYER: Far away, large, slow, dim
          Creates sense of vast space and distance */}
      <Sparkles
        ref={backgroundRef}
        count={bgCount}
        scale={22}
        size={size * 2.5}
        speed={0.15}
        opacity={baseOpacity * 0.5}
        color="#a89b8c"
      />

      {/* MIDGROUND LAYER: Main particle field
          Normal distribution, standard speed */}
      <Sparkles
        ref={midgroundRef}
        count={midCount}
        scale={12}
        size={size}
        speed={0.5}
        opacity={baseOpacity}
        color="#8c7b6c"
      />

      {/* FOREGROUND LAYER: Close, small, fast, bright
          Creates intimacy and subtle motion blur effect */}
      <Sparkles
        ref={foregroundRef}
        count={fgCount}
        scale={6}
        size={size * 0.6}
        speed={0.9}
        opacity={baseOpacity * 1.3}
        color="#b8a896"
      />
    </group>
  );
}
