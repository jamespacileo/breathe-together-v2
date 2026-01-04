/**
 * PhaseRings - Three concentric holographic rings at the globe equator
 *
 * Visual representation of the 4-7-8 breathing cycle:
 * - Inner ring (teal): Inhale phase (4s)
 * - Middle ring (white): Hold phase (7s)
 * - Outer ring (gold): Exhale phase (8s)
 *
 * Active ring glows brightly and scales up.
 * Inactive rings stay dim and semi-transparent.
 *
 * Uses simple MeshBasicMaterial for reliable rendering.
 */

import { Ring } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase, phaseType } from '../breath/traits';
import { HOLO_COLORS } from './materials';

/**
 * Ring configuration for each breathing phase
 */
const RING_CONFIG = [
  {
    id: 'ring-inhale',
    phase: 0, // Inhale
    innerRadius: 1.72,
    outerRadius: 1.78,
    color: HOLO_COLORS.RING_INHALE,
  },
  {
    id: 'ring-hold',
    phase: 1, // Hold
    innerRadius: 1.88,
    outerRadius: 1.94,
    color: HOLO_COLORS.RING_HOLD,
  },
  {
    id: 'ring-exhale',
    phase: 2, // Exhale
    innerRadius: 2.04,
    outerRadius: 2.1,
    color: HOLO_COLORS.RING_EXHALE,
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
}

/**
 * PhaseRings - Concentric rings showing breathing cycle progress
 */
export function PhaseRings({
  scale = 1.0,
  enableRotation = true,
  rotationSpeed = 0.0004,
  debugPhase = -1,
}: PhaseRingsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const world = useWorld();

  // Create simple materials for each ring
  const materials = useMemo(
    () =>
      RING_CONFIG.map((config) => ({
        ...config,
        material: new THREE.MeshBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      })),
    [],
  );

  // Cleanup materials on unmount
  useDisposeMaterials(materials.map((m) => m.material));

  // Animation loop
  useFrame(() => {
    if (!groupRef.current) return;

    // Slow rotation
    if (enableRotation) {
      groupRef.current.rotation.z += rotationSpeed;
    }

    // Get breath state
    let currentPhase = 0;

    if (debugPhase >= 0) {
      currentPhase = debugPhase;
    } else {
      try {
        const breathEntity = world.queryFirst(breathPhase);
        if (breathEntity) {
          currentPhase = breathEntity.get(phaseType)?.value ?? 0;
        }
      } catch {
        // Ignore ECS errors during unmount
      }
    }

    // Update each ring material and scale
    materials.forEach(({ phase, material, color }, index) => {
      const isActive = phase === currentPhase;
      const mesh = ringRefs.current[index];

      // Update opacity: active = bright, inactive = dim
      material.opacity = isActive ? 0.7 : 0.15;

      // Update color: active = brighter version
      if (isActive) {
        const brightColor = new THREE.Color(color).multiplyScalar(1.3);
        material.color.copy(brightColor);
      } else {
        material.color.set(color);
      }

      // Scale animation for active ring
      if (mesh) {
        const targetScale = isActive ? 1.05 : 1.0;
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, 1), 0.1);
      }
    });
  });

  return (
    <group ref={groupRef} name="PhaseRings" rotation={[Math.PI / 2, 0, 0]}>
      {materials.map(({ id, innerRadius, outerRadius, material }, index) => (
        <Ring
          key={id}
          ref={(el) => {
            ringRefs.current[index] = el as THREE.Mesh | null;
          }}
          args={[innerRadius * scale, outerRadius * scale, 64]}
          material={material}
        />
      ))}
    </group>
  );
}

export default PhaseRings;
