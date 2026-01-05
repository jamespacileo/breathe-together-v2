/**
 * ReflectiveFloor - Subtle reflective floor using MeshReflectorMaterial
 *
 * Adds depth and subtle reflections of the scene for enhanced spatial awareness.
 * Performance-optimized with lower resolution and subtle mix strength.
 *
 * Features:
 * - Subtle reflections of globe and particles
 * - Blurred reflection for soft aesthetic
 * - Low resolution (512px) for mobile performance
 * - Monument Valley color palette integration
 */

import { MeshReflectorMaterial } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface ReflectiveFloorProps {
  /** Floor color matching background @default '#f5f1e8' */
  color?: string;
  /** Y position of the floor @default -3 */
  position?: number;
  /** Floor size in world units @default 50 */
  size?: number;
  /** Reflection blur amount [horizontal, vertical] @default [400, 100] */
  blur?: [number, number];
  /** Reflection resolution (lower = better performance) @default 512 */
  resolution?: number;
  /** Reflection mix strength (0 = no reflection, 1 = full mirror) @default 0.3 */
  mixStrength?: number;
  /** Reflection blur intensity @default 0.5 */
  mixBlur?: number;
  /** Mirror strength (0 = no mirror, 1 = perfect mirror) @default 0 */
  mirror?: number;
}

/**
 * ReflectiveFloor component - adds subtle reflections
 *
 * Uses drei's MeshReflectorMaterial for performance-optimized reflections.
 * Configured for subtle Monument Valley aesthetic.
 */
export function ReflectiveFloor({
  color = '#f5f1e8',
  position = -3,
  size = 50,
  blur = [400, 100],
  resolution = 512,
  mixStrength = 0.3,
  mixBlur = 0.5,
  mirror = 0,
}: ReflectiveFloorProps) {
  // Create geometry
  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size), [size]);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, position, 0]}
      geometry={geometry}
      receiveShadow
    >
      <MeshReflectorMaterial
        blur={blur}
        resolution={resolution}
        mixBlur={mixBlur}
        mixStrength={mixStrength}
        mirror={mirror}
        color={color}
        metalness={0}
        roughness={1}
        depthScale={0}
        minDepthThreshold={0.9}
        maxDepthThreshold={1}
      />
    </mesh>
  );
}

export default ReflectiveFloor;
