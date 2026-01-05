/**
 * GroundPlane - Subtle reflective ground reference for spatial anchoring
 *
 * Creates a very subtle ground plane that provides:
 * - Spatial reference (helps brain locate "down")
 * - Subtle reflection hint for depth
 * - Grounding element in vast environment
 *
 * Extremely low opacity to avoid visual clutter.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

interface GroundPlaneProps {
  /** Enable/disable ground plane */
  enabled?: boolean;
  /** Overall opacity multiplier */
  opacity?: number;
  /** Ground plane color */
  color?: string;
  /** Size of the ground plane */
  size?: number;
}

export function GroundPlane({ enabled = true, opacity = 1, color, size }: GroundPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { Y, OPACITY, SIZE, COLOR } = SCENE_DEPTH.GROUND;
  const finalColor = color ?? COLOR;
  const finalSize = size ?? SIZE;
  const finalOpacity = OPACITY * opacity;

  // Subtle shimmer animation
  useFrame((state) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    const time = state.clock.elapsedTime;
    material.opacity = finalOpacity * (0.8 + Math.sin(time * 0.3) * 0.2);
  });

  if (!enabled) return null;

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, Y, 0]} name="ground-plane">
      <planeGeometry args={[finalSize, finalSize]} />
      <meshBasicMaterial
        color={finalColor}
        transparent
        opacity={finalOpacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
