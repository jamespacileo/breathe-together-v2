/**
 * FrostedGlassMaterial - Simplified glass material without render targets
 *
 * Uses MeshPhysicalMaterial with transmission for glass effect.
 * This approach avoids WebGL context leaks from complex refraction pipelines.
 *
 * Visual features:
 * - Transmission for light passing through
 * - Roughness for frosted appearance
 * - Per-vertex colors for mood-based tinting
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface FrostedGlassMaterialProps {
  /** Base color for material @default '#ffffff' */
  color?: string;
}

export function FrostedGlassMaterial({ color = '#ffffff' }: FrostedGlassMaterialProps) {
  // MeshPhysicalMaterial with transmission - no render targets needed
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        vertexColors: true, // Enable per-vertex colors for mood tinting
        transmission: 0.9, // Glass-like transparency
        opacity: 1,
        metalness: 0.0,
        roughness: 0.3, // Frosted glass appearance
        thickness: 0.5, // Simulated glass thickness
        envMapIntensity: 1.0,
        clearcoat: 0.1, // Subtle surface reflection
        clearcoatRoughness: 0.2,
      }),
    [color],
  );

  // GPU memory cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return <primitive object={material} attach="material" />;
}

/**
 * Creates a frosted glass material instance for imperative use
 */
export function createFrostedGlassMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    vertexColors: true,
    transmission: 0.9,
    opacity: 1,
    metalness: 0.0,
    roughness: 0.3,
    thickness: 0.5,
    envMapIntensity: 1.0,
    clearcoat: 0.1,
    clearcoatRoughness: 0.2,
  });
}
