/**
 * EarthGlobe - Central core visualization (ceramic earth sphere)
 *
 * Smooth sphere that:
 * - Uses a stylized Monument Valley earth texture
 * - Breathes with the meditation cycle (via ECS sphereScale trait)
 * - Rotates slowly on Y-axis
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { sphereScale } from '../breath/traits';
import { CoreMaterial } from './CoreMaterial';

/**
 * EarthGlobe component props
 */
interface EarthGlobeProps {
  /** Rotation speed in radians per second @default 0.08 */
  rotationSpeed?: number;
  /** Enable continuous Y-axis rotation @default true */
  enableRotation?: boolean;
  /** Resolution of the sphere (segments) @default 64 */
  resolution?: number;
  /** Tint color for the ceramic look @default '#ffffff' */
  tintColor?: string;
}

/**
 * EarthGlobe - Renders a smooth ceramic sphere with stylized earth texture
 */
export function EarthGlobe({
  rotationSpeed = 0.08,
  enableRotation = true,
  resolution = 64,
  tintColor = '#ffffff',
}: Partial<EarthGlobeProps> = {}) {
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();
  const rotationRef = useRef(0);

  // Sphere geometry - high resolution for smooth ceramic look and clean UVs
  const geometry = useMemo(() => new THREE.SphereGeometry(1, resolution, resolution), [resolution]);

  // Cleanup GPU resources on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  /**
   * Update globe scale and rotation in single atomic frame update
   * Combines ECS sphere scale (breathing) with continuous rotation
   */
  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    try {
      // Update scale from ECS breathing system
      const breathEntity = world?.queryFirst?.(sphereScale);
      if (breathEntity) {
        const scale = breathEntity.get?.(sphereScale)?.value ?? 1;
        groupRef.current.scale.set(scale, scale, scale);
      }

      // Update rotation
      if (enableRotation) {
        rotationRef.current += rotationSpeed * delta;
        groupRef.current.rotation.y = rotationRef.current;
      }
    } catch (error) {
      // Ignore ECS errors during unmount/remount in Triplex
      if (import.meta.env.DEV) {
        console.warn('[EarthGlobe] ECS error (expected during Triplex hot-reload):', error);
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh name="Core Mesh" geometry={geometry}>
        <CoreMaterial tintColor={tintColor} />
      </mesh>
    </group>
  );
}

export default EarthGlobe;
