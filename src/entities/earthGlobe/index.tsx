/**
 * EarthGlobe - Central core visualization (textured ceramic earth sphere)
 *
 * Features:
 * - SphereGeometry with proper UVs for earth texture mapping
 * - Stylized Monument Valley earth texture
 * - MeshStandardMaterial for ceramic/illustrative look
 * - Subtle pulse animation (1.0 → 1.04, 4% scale change)
 * - Slow Y-axis rotation
 *
 * Note: Does NOT use refraction pipeline - renders as textured ceramic sphere
 */

import { useFrame, useLoader } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { breathPhase } from '../breath/traits';

/**
 * EarthGlobe component props
 */
interface EarthGlobeProps {
  /** Core radius @default 1.5 */
  radius?: number;
  /** Resolution of the sphere (segments) @default 64 */
  resolution?: number;
  /** Enable continuous Y-axis rotation @default true */
  enableRotation?: boolean;
  /** Texture path @default '/textures/earth-texture.png' */
  texturePath?: string;
}

/**
 * EarthGlobe - Renders a textured ceramic earth sphere as the central core
 */
export function EarthGlobe({
  radius = 1.5,
  resolution = 64,
  enableRotation = true,
  texturePath = '/textures/earth-texture.png',
}: Partial<EarthGlobeProps> = {}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  // Load earth texture
  const earthTexture = useLoader(THREE.TextureLoader, texturePath);

  // Configure texture for proper sphere mapping
  useEffect(() => {
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.wrapS = THREE.RepeatWrapping;
    earthTexture.wrapT = THREE.ClampToEdgeWrapping;
  }, [earthTexture]);

  // Create material with earth texture - illustrative look (no lighting required)
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: earthTexture,
        side: THREE.FrontSide,
      }),
    [earthTexture],
  );

  // Sphere geometry with proper UVs for texture mapping
  const geometry = useMemo(
    () => new THREE.SphereGeometry(radius, resolution, resolution),
    [radius, resolution],
  );

  // Cleanup GPU resources on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

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
    <mesh
      ref={meshRef}
      name="Earth Globe"
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}

export default EarthGlobe;
