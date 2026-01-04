/**
 * BreathFireflies - Glowing motes that emerge during exhale
 *
 * Features:
 * - Sparkles that pulse brighter during exhale phase
 * - Warm golden/amber color palette
 * - Float upward gently during exhale, settle during inhale
 * - Creates a "visible breath" effect in cold air
 *
 * Uses drei Sparkles with breathing-synchronized opacity and scale
 */

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useRef } from 'react';
import type * as THREE from 'three';
import { breathPhase, phaseType } from '../breath/traits';

export interface BreathFirefliesProps {
  /**
   * Number of firefly particles
   * @default 50
   * @min 10
   * @max 200
   */
  count?: number;

  /**
   * Base size of fireflies
   * @default 0.15
   * @min 0.05
   * @max 0.5
   */
  size?: number;

  /**
   * Maximum opacity during exhale
   * @default 0.8
   * @min 0
   * @max 1
   */
  maxOpacity?: number;

  /**
   * Minimum opacity during inhale
   * @default 0.1
   * @min 0
   * @max 1
   */
  minOpacity?: number;

  /**
   * Primary firefly color
   * @default '#ffd54f'
   */
  color?: string;

  /**
   * Radius of the spawn area (around globe atmosphere)
   * @default 5
   * @min 2
   * @max 15
   */
  radius?: number;

  /**
   * Enable fireflies
   * @default true
   */
  enabled?: boolean;
}

/**
 * BreathFireflies - Exhale-synchronized glowing particles
 *
 * During exhale: Fireflies brighten, scale up, and drift upward
 * During inhale: Fireflies dim and settle back down
 */
export const BreathFireflies = memo(function BreathFireflies({
  count = 50,
  size = 0.15,
  maxOpacity = 0.8,
  minOpacity = 0.1,
  color = '#ffd54f',
  radius = 5,
  enabled = true,
}: BreathFirefliesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sparklesRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const world = useWorld();

  // Store initial Y offset for floating animation
  const baseYRef = useRef(0);

  // Animate based on breathing phase
  useFrame(() => {
    if (!sparklesRef.current || !groupRef.current) return;

    // Cache material reference
    if (!materialRef.current) {
      materialRef.current = sparklesRef.current.material as THREE.PointsMaterial;
    }

    const breathEntity = world.queryFirst(breathPhase);
    const phaseEntity = world.queryFirst(phaseType);

    if (breathEntity && materialRef.current) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      const currentPhaseType = phaseEntity?.get(phaseType)?.value ?? 0;

      // Inverse relationship: fireflies brighten on exhale (phase going 1→0)
      // During exhale (phase 2) or hold-out (phase 3), fireflies are bright
      const isExhaling = currentPhaseType === 2 || currentPhaseType === 3;
      const targetOpacity = isExhaling
        ? maxOpacity - phase * (maxOpacity - minOpacity) * 0.5
        : minOpacity + phase * (maxOpacity - minOpacity) * 0.3;

      materialRef.current.opacity = targetOpacity;

      // Gentle upward drift during exhale
      const yOffset = isExhaling ? (1 - phase) * 0.5 : 0;
      groupRef.current.position.y = baseYRef.current + yOffset;

      // Subtle scale pulse
      const scale = 1 + (1 - phase) * 0.15;
      groupRef.current.scale.setScalar(scale);
    }
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef}>
      <Sparkles
        ref={sparklesRef}
        count={count}
        scale={radius * 2}
        size={size}
        speed={0.3}
        opacity={minOpacity}
        color={color}
        noise={1.5}
      />
    </group>
  );
});

export default BreathFireflies;
