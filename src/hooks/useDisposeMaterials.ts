import { useEffect, useRef } from 'react';
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
  const materialsRef = useRef<Set<THREE.Material>>(new Set());

  useEffect(() => {
    const nextMaterials = new Set(
      materials.filter((material): material is THREE.Material => Boolean(material)),
    );

    // Dispose materials that were removed from the list
    for (const material of materialsRef.current) {
      if (!nextMaterials.has(material)) {
        material.dispose();
      }
    }

    materialsRef.current = nextMaterials;
  }, [materials]);

  useEffect(() => {
    return () => {
      for (const material of materialsRef.current) {
        material?.dispose();
      }
    };
  }, []);
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
  const geometriesRef = useRef<Set<THREE.BufferGeometry>>(new Set());

  useEffect(() => {
    const nextGeometries = new Set(
      geometries.filter((geometry): geometry is THREE.BufferGeometry => Boolean(geometry)),
    );

    // Dispose geometries that were removed from the list
    for (const geometry of geometriesRef.current) {
      if (!nextGeometries.has(geometry)) {
        geometry.dispose();
      }
    }

    geometriesRef.current = nextGeometries;
  }, [geometries]);

  useEffect(() => {
    return () => {
      for (const geometry of geometriesRef.current) {
        geometry?.dispose();
      }
    };
  }, []);
}
