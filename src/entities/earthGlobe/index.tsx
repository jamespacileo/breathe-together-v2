/**
 * EarthGlobe - Central Earth visualization
 *
 * Simple sphere that:
 * - Breathes with the meditation cycle (via ECS sphereScale trait)
 * - Rotates slowly on Y-axis
 * - Has a frosted glass overlay
 */

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { sphereScale } from '../breath/traits';

/**
 * EarthGlobe component props
 */
interface EarthGlobeProps {
  rotationSpeed?: number;
  enableRotation?: boolean;
}

/**
 * EarthGlobe - Renders a textured sphere with frosted glass overlay
 */
export function EarthGlobe({
  rotationSpeed = 0.08,
  enableRotation = true,
}: Partial<EarthGlobeProps> = {}) {
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();
  const rotationRef = useRef(0);

  // Load earth texture with automatic suspension
  // Use dynamic base URL to work correctly in both dev (/) and production (/breathe-together-v2/)
  const texture = useTexture(`${import.meta.env.BASE_URL}textures/earth-texture.png`);
  texture.colorSpace = THREE.SRGBColorSpace; // Safe: useTexture object is stable

  // Create geometries - using unit sphere (radius 1) because scaling is handled via trait
  const globeGeometry = useMemo(() => new THREE.SphereGeometry(1, 64, 64), []);
  const overlayGeometry = useMemo(() => new THREE.SphereGeometry(1.01, 64, 64), []);

  // Globe material - use texture
  const globeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.7,
        metalness: 0.2,
      }),
    [texture],
  );

  // Frosted glass overlay material - subtle reflection/sheen
  const overlayMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        transparent: true,
        opacity: 0.15,
        transmission: 0.6,
        thickness: 0.5,
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        side: THREE.DoubleSide,
      }),
    [],
  );

  // Cleanup GPU resources on unmount (geometry and materials)
  // Texture disposal is handled automatically by useTexture hook
  useEffect(() => {
    return () => {
      globeGeometry.dispose();
      overlayGeometry.dispose();
      globeMaterial.dispose();
      overlayMaterial.dispose();
    };
  }, [globeGeometry, overlayGeometry, globeMaterial, overlayMaterial]);

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
    } catch (_e) {
      // Ignore ECS errors during unmount/remount
    }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={globeGeometry} material={globeMaterial} />
      <mesh geometry={overlayGeometry} material={overlayMaterial} />
    </group>
  );
}

export default EarthGlobe;
