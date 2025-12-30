/**
 * Environment - Simple calming meditation environment with gradient background and clouds.
 * Provides a serene blue-violet gradient with slowly drifting clouds and soft lighting.
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface EnvironmentProps {
  /**
   * Enable/disable environment rendering.
   *
   * @group "Configuration"
   * @default true
   */
  enabled?: boolean;
}

/**
 * Environment component - Monument Valley inspired gradient background with lighting.
 *
 * Features:
 * - Warm neutral gradient background (Monument Valley aesthetic)
 * - Simple three-light setup for optimal globe + shard visibility
 * - Minimal design without visual clutter
 */
export function Environment({ enabled = true }: EnvironmentProps = {}) {
  const gradientMesh = useRef<THREE.Mesh>(null);

  // Simple background material (solid color instead of shader)
  const gradientMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xfaf8f3, // Monument Valley off-white
      side: THREE.BackSide,
      depthWrite: false,
    });
  }, []);


  if (!enabled) return null;

  return (
    <>
      {/* Background sphere with gradient shader */}
      <mesh ref={gradientMesh} renderOrder={-1000} frustumCulled={false}>
        <sphereGeometry args={[50, 32, 32]} />
        <primitive
          object={gradientMaterial}
          attach="material"
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.8} color="#fffef7" />
      <directionalLight position={[10, 10, 10]} intensity={0.4} color="#fff" />
    </>
  );
}
