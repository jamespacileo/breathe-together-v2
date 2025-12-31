import { useEffect } from 'react';
import type * as THREE from 'three';

/**
 * Hook to dispose Three.js materials on component unmount
 *
 * Three.js materials consume GPU memory and must be manually disposed
 * when no longer needed. This hook provides a clean way to register
 * materials for automatic cleanup when the component unmounts.
 *
 * @param materials - Array of materials to dispose on unmount
 *
 * @example
 * ```tsx
 * const material = useMemo(() => new THREE.ShaderMaterial({...}), []);
 * const glowMaterial = useMemo(() => new THREE.MeshBasicMaterial({...}), []);
 *
 * // Automatically disposed when component unmounts
 * useDisposeMaterials([material, glowMaterial]);
 *
 * return <mesh material={material} />;
 * ```
 */
export function useDisposeMaterials(materials: (THREE.Material | null | undefined)[]): void {
  useEffect(() => {
    return () => {
      for (const material of materials) {
        material?.dispose();
      }
    };
  }, [materials]);
}

/**
 * Hook to dispose Three.js geometries on component unmount
 *
 * Three.js geometries consume GPU memory (vertex buffers) and must be
 * manually disposed when no longer needed.
 *
 * @param geometries - Array of geometries to dispose on unmount
 *
 * @example
 * ```tsx
 * const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 4), []);
 *
 * useDisposeGeometries([geometry]);
 *
 * return <mesh geometry={geometry} />;
 * ```
 */
export function useDisposeGeometries(
  geometries: (THREE.BufferGeometry | null | undefined)[],
): void {
  useEffect(() => {
    return () => {
      for (const geometry of geometries) {
        geometry?.dispose();
      }
    };
  }, [geometries]);
}
