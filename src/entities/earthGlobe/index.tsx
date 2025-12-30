/**
 * EarthGlobe - Central core visualization (ceramic icosahedron)
 *
 * Faceted icosahedron that:
 * - Uses Monument Valley inspired refraction shader
 * - Breathes with the meditation cycle (via ECS sphereScale trait)
 * - Rotates slowly on Y-axis
 *
 * Matches reference: IcosahedronGeometry with detail 3 for clean ceramic look
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
  /** Detail level of the icosahedron (0-4) @default 3 */
  detail?: number;
  /** Radius of the core @default 2.4 */
  radius?: number;
  /** Tint color for the ceramic look @default '#fffef7' */
  tintColor?: string;
}

/**
 * EarthGlobe - Renders a faceted ceramic icosahedron with refraction shader
 */
export function EarthGlobe({
  rotationSpeed = 0.08,
  enableRotation = true,
  detail = 3,
  radius = 2.4,
  tintColor = '#fffef7',
}: Partial<EarthGlobeProps> = {}) {
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();
  const rotationRef = useRef(0);

  // Icosahedron geometry - faceted for Monument Valley aesthetic
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(radius, detail), [radius, detail]);

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
        // Apply subtle breathing pulse (matches reference: 1.0 + easedBreath * 0.04)
        const pulseScale = 1.0 + (scale - 1.0) * 0.5;
        groupRef.current.scale.set(pulseScale, pulseScale, pulseScale);
      }

      // Update rotation (slow counter-clockwise like reference)
      if (enableRotation) {
        rotationRef.current -= rotationSpeed * delta;
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
