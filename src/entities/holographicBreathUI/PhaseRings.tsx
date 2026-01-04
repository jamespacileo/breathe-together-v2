/**
 * PhaseRings - Three concentric holographic rings at the globe equator
 *
 * Visual representation of the 4-7-8 breathing cycle:
 * - Inner ring (teal): Inhale phase (4s)
 * - Middle ring (white): Hold phase (7s)
 * - Outer ring (gold): Exhale phase (8s)
 *
 * Active ring glows brightly and shows progress fill.
 * Inactive rings stay dim and semi-transparent.
 */

import { Ring } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';

import { useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase, phaseType, rawProgress } from '../breath/traits';
import { createRingMaterial, HOLO_COLORS } from './materials';

/**
 * Get breath state from ECS or debug values
 */
function getBreathState(
  world: ReturnType<typeof useWorld>,
  debugPhase: number,
  debugProgress: number,
): { phase: number; progress: number; breathValue: number } {
  if (debugPhase >= 0) {
    const progress = debugProgress >= 0 ? debugProgress : 0.5;
    return { phase: debugPhase, progress, breathValue: progress };
  }

  try {
    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity) {
      return {
        phase: breathEntity.get(phaseType)?.value ?? 0,
        progress: breathEntity.get(rawProgress)?.value ?? 0,
        breathValue: breathEntity.get(breathPhase)?.value ?? 0,
      };
    }
  } catch {
    // Ignore ECS errors during unmount
  }

  return { phase: 0, progress: 0, breathValue: 0 };
}

/**
 * Ring configuration for each breathing phase
 */
const RING_CONFIG = [
  {
    phase: 0, // Inhale
    innerRadius: 1.7,
    outerRadius: 1.75,
    color: HOLO_COLORS.RING_INHALE,
    label: '4',
  },
  {
    phase: 1, // Hold
    innerRadius: 1.85,
    outerRadius: 1.9,
    color: HOLO_COLORS.RING_HOLD,
    label: '7',
  },
  {
    phase: 2, // Exhale
    innerRadius: 2.0,
    outerRadius: 2.05,
    color: HOLO_COLORS.RING_EXHALE,
    label: '8',
  },
];

interface PhaseRingsProps {
  /** Scale multiplier for ring sizes @default 1.0 */
  scale?: number;
  /** Enable ring rotation animation @default true */
  enableRotation?: boolean;
  /** Rotation speed (rad/frame) @default 0.0004 */
  rotationSpeed?: number;
  /** Debug mode - force specific phase @default -1 */
  debugPhase?: number;
  /** Debug mode - force specific progress @default -1 */
  debugProgress?: number;
}

/**
 * Update ring materials based on current breath state
 */
function updateRingMaterials(
  materials: Array<{ phase: number; material: THREE.ShaderMaterial }>,
  breathState: { phase: number; progress: number; breathValue: number },
  elapsedTime: number,
) {
  for (const { phase, material } of materials) {
    const isActive = phase === breathState.phase;
    material.uniforms.uTime.value = elapsedTime;
    material.uniforms.uBreathPhase.value = breathState.breathValue;
    material.uniforms.uIsActive.value = isActive ? 1.0 : 0.0;
    material.uniforms.uProgress.value = isActive ? breathState.progress : 0;
    material.uniforms.uOpacity.value = isActive ? 0.6 : 0.15;
  }
}

/**
 * PhaseRings - Concentric rings showing breathing cycle progress
 */
export function PhaseRings({
  scale = 1.0,
  enableRotation = true,
  rotationSpeed = 0.0004,
  debugPhase = -1,
  debugProgress = -1,
}: PhaseRingsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();

  // Create materials for each ring
  const materials = useMemo(
    () =>
      RING_CONFIG.map((config) => ({
        ...config,
        material: createRingMaterial(config.color),
      })),
    [],
  );

  // Cleanup materials on unmount
  useDisposeMaterials(materials.map((m) => m.material));

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current) return;

    // Slow rotation
    if (enableRotation) {
      groupRef.current.rotation.z += rotationSpeed;
    }

    // Get breath state and update materials
    const breathState = getBreathState(world, debugPhase, debugProgress);
    updateRingMaterials(materials, breathState, state.clock.elapsedTime);
  });

  return (
    <group ref={groupRef} name="PhaseRings" rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      {materials.map(({ phase, innerRadius, outerRadius, material }) => (
        <Ring
          key={phase}
          args={[innerRadius * scale, outerRadius * scale, 64]}
          material={material}
        />
      ))}
    </group>
  );
}

export default PhaseRings;
