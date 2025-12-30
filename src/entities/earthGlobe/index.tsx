/**
 * EarthGlobe - Central core visualization (ceramic icosahedron)
 *
 * Faceted icosahedron that:
 * - Uses Monument Valley inspired refraction shader
 * - Breathes with the meditation cycle (via ECS breathPhase trait)
 * - Rotates slowly on Y-axis
 *
 * Matches reference: IcosahedronGeometry with detail 3 for clean ceramic look
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { breathPhase } from '../breath/traits';
import { CoreMaterial } from './CoreMaterial';

/**
 * EarthGlobe component props
 */
interface EarthGlobeProps {
  /** Detail level of the icosahedron (0-4) @default 3 */
  detail?: number;
  /** Radius of the core @default 2.4 */
  radius?: number;
  /** Enable continuous Y-axis rotation @default true */
  enableRotation?: boolean;
  /** Tint color for the ceramic look @default '#fffef7' */
  tintColor?: string;
}

/**
 * EarthGlobe - Renders a faceted ceramic icosahedron with refraction shader
 */
export function EarthGlobe({
  detail = 3,
  radius = 2.4,
  enableRotation = true,
  tintColor = '#fffef7',
}: Partial<EarthGlobeProps> = {}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  // Icosahedron geometry - faceted for Monument Valley aesthetic
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(radius, detail), [radius, detail]);

  // Cleanup GPU resources on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  /**
   * Update globe scale and rotation
   * Uses subtle pulse: 1.0 + breathPhase * 0.04 (4% scale change)
   * Rotation: -0.001 rad/frame (matching reference)
   */
  useFrame(() => {
    if (!meshRef.current) return;

    try {
      // Get breath phase for subtle pulse animation
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get?.(breathPhase)?.value ?? 0;
        // Subtle pulse: 1.0 to 1.04 (4% scale change)
        const scale = 1.0 + phase * 0.04;
        meshRef.current.scale.set(scale, scale, scale);
      }

      // Slow rotation (matching reference: -0.001 rad/frame)
      if (enableRotation) {
        meshRef.current.rotation.y -= 0.001;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  return (
    <mesh ref={meshRef} name="Core Mesh" geometry={geometry} frustumCulled={false}>
      <CoreMaterial tintColor={tintColor} />
    </mesh>
  );
}

export default EarthGlobe;
