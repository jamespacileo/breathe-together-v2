/**
 * EarthGlobe - Central Earth visualization
 *
 * Simple sphere that:
 * - Breathes with the meditation cycle (via ECS breathPhase trait)
 * - Rotates slowly on Y-axis
 * - Has a frosted glass overlay
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { breathPhase } from '../breath/traits';

/**
 * EarthGlobe component props
 */
interface EarthGlobeProps {
  globeScale?: number;
  breathingScale?: number;
  rotationSpeed?: number;
  enableRotation?: boolean;
}

/**
 * EarthGlobe - Renders a colored sphere with frosted glass overlay
 */
export function EarthGlobe({
  globeScale = 1.2,
  breathingScale = 0.02,
  rotationSpeed = 0.08,
  enableRotation = true,
}: Partial<EarthGlobeProps> = {}) {
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();
  const rotationRef = useRef(0);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Load earth texture on mount
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/textures/earth-texture.png', (loadedTexture) => {
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      setTexture(loadedTexture);
    });
  }, []);

  // Create geometries
  const globeGeometry = useMemo(() => new THREE.SphereGeometry(globeScale, 32, 32), [globeScale]);
  const overlayGeometry = useMemo(
    () => new THREE.SphereGeometry(globeScale + 0.02, 32, 32),
    [globeScale],
  );

  // Globe material - use texture if loaded, fallback to color
  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        map: texture || undefined,
        color: texture ? 0xffffff : 0x8b6f47, // White if texture, brown if fallback
        emissive: texture ? 0x000000 : 0x2a2415,
        shininess: texture ? 10 : 20,
      }),
    [texture],
  );

  // Frosted glass overlay material
  const overlayMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0.12,
        metalness: 0.3,
        roughness: 0.6,
        side: THREE.DoubleSide,
      }),
    [],
  );

  // Cleanup resources on unmount
  useEffect(() => {
    return () => {
      globeGeometry.dispose();
      overlayGeometry.dispose();
      globeMaterial.dispose();
      overlayMaterial.dispose();
      texture?.dispose();
    };
  }, [globeGeometry, overlayGeometry, globeMaterial, overlayMaterial, texture]);

  /**
   * Update globe scale based on breathing animation
   */
  useFrame(() => {
    if (!groupRef.current) return;

    try {
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (!breathEntity) return;

      const phase = breathEntity.get?.(breathPhase)?.value ?? 0;
      const scaleFactor = 1 + (phase - 0.5) * breathingScale * 2;
      const currentScale = globeScale * scaleFactor;

      groupRef.current.scale.set(currentScale, currentScale, currentScale);
    } catch (_e) {
      // Ignore ECS errors
    }
  });

  /**
   * Handle rotation
   */
  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    if (enableRotation) {
      rotationRef.current += rotationSpeed * delta;
      groupRef.current.rotation.y = rotationRef.current;
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
