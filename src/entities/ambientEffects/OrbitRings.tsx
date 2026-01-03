/**
 * OrbitRings - Ethereal concentric rings showing orbital paths
 *
 * Features:
 * - Multiple translucent rings at different radii
 * - Breath-synchronized opacity and subtle scale pulsing
 * - Slow rotation for organic movement
 * - Gradient from inner warm tones to outer cool tones
 *
 * Visual style: Subtle, atmospheric guide rings that hint at orbital paths
 */

import { Ring } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase } from '../breath/traits';

/**
 * Ring configuration - each ring has unique radius, color, and animation offset
 */
const RING_CONFIGS = [
  { radius: 3.2, width: 0.008, color: '#e8d4c8', baseOpacity: 0.06, phaseOffset: 0 },
  { radius: 4.0, width: 0.006, color: '#d4c8b8', baseOpacity: 0.05, phaseOffset: 0.15 },
  { radius: 4.8, width: 0.005, color: '#c8d4d8', baseOpacity: 0.04, phaseOffset: 0.3 },
  { radius: 5.6, width: 0.004, color: '#b8c8d4', baseOpacity: 0.03, phaseOffset: 0.45 },
];

export interface OrbitRingsProps {
  /** Enable/disable the effect @default true */
  enabled?: boolean;
  /** Overall opacity multiplier @default 1.0 */
  opacityMultiplier?: number;
  /** Rotation speed @default 0.05 */
  rotationSpeed?: number;
}

/**
 * OrbitRings - Renders ethereal concentric orbital guide rings
 */
export const OrbitRings = memo(function OrbitRingsComponent({
  enabled = true,
  opacityMultiplier = 1.0,
  rotationSpeed = 0.05,
}: OrbitRingsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();

  // Create materials for each ring
  const materials = useMemo(
    () =>
      RING_CONFIGS.map(
        (config) =>
          new THREE.MeshBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: config.baseOpacity * opacityMultiplier,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending,
          }),
      ),
    [opacityMultiplier],
  );

  // Cleanup materials on unmount
  useDisposeMaterials(materials);

  // Store refs to individual ring meshes for animation
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    if (!enabled || !groupRef.current) return;

    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhase)?.value ?? 0;

        // Animate each ring with phase offset for wave effect
        ringRefs.current.forEach((ring, i) => {
          if (ring && materials[i]) {
            const config = RING_CONFIGS[i];
            // Delayed phase for cascading effect
            const delayedPhase = Math.max(0, Math.min(1, phase - config.phaseOffset));
            // Opacity pulses with breathing
            materials[i].opacity = (config.baseOpacity + delayedPhase * 0.04) * opacityMultiplier;
            // Subtle scale pulse
            const scale = 1.0 + delayedPhase * 0.02;
            ring.scale.set(scale, scale, 1);
          }
        });
      }

      // Slow rotation - different axes for each ring creates ethereal movement
      const time = state.clock.elapsedTime * rotationSpeed;
      groupRef.current.rotation.x = Math.sin(time * 0.3) * 0.1;
      groupRef.current.rotation.z = Math.cos(time * 0.2) * 0.05;
    } catch {
      // Ignore ECS errors during unmount/remount
    }
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef} name="Orbit Rings">
      {RING_CONFIGS.map((config, i) => (
        <Ring
          key={`orbit-ring-${config.radius}`}
          ref={(el) => {
            ringRefs.current[i] = el;
          }}
          args={[config.radius - config.width, config.radius + config.width, 128]}
          rotation={[Math.PI / 2, 0, 0]}
          material={materials[i]}
        />
      ))}
    </group>
  );
});

export default OrbitRings;
