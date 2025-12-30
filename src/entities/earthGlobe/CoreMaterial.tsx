/**
 * CoreMaterial - Frosted glass material for the central core
 *
 * Uses MeshPhysicalMaterial with transmission for frosted glass effect.
 * Simpler and more compatible than TSL NodeMaterial with WebGL.
 */

import { useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface CoreMaterialProps {
  /** Tint color for the ceramic look @default '#ffffff' */
  tintColor?: string;
  /** Roughness for soft reflections @default 0.15 */
  roughness?: number;
  /** Clearcoat intensity for the glaze effect @default 1.0 */
  clearcoat?: number;
}

export function CoreMaterial({
  tintColor = '#ffffff',
  roughness = 0.15,
  clearcoat = 1.0,
}: CoreMaterialProps) {
  // Load the stylized earth texture
  const earthTexture = useTexture('/textures/earth-texture.png');

  // Configure texture for best quality
  useEffect(() => {
    if (earthTexture) {
      earthTexture.colorSpace = THREE.SRGBColorSpace;
      earthTexture.anisotropy = 8;
      earthTexture.needsUpdate = true;
    }
  }, [earthTexture]);

  // Use MeshPhysicalMaterial for ceramic look - compatible with WebGL
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: earthTexture,
        color: tintColor,
        roughness,
        metalness: 0.0,
        clearcoat,
        clearcoatRoughness: 0.1,
        ior: 1.5, // Higher IOR for ceramic/glass glaze
        sheen: 0.5, // Soft edge highlights
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color('#ffffff'),
        envMapIntensity: 1.0,
      }),
    [earthTexture, tintColor, roughness, clearcoat],
  );

  // GPU memory cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return <primitive object={material} attach="material" />;
}
