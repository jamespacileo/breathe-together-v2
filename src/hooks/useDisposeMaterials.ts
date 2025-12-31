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

/**
 * Hook to dispose Three.js render targets on component unmount
 *
 * Render targets consume GPU memory (framebuffers + textures) and must be
 * manually disposed when no longer needed.
 *
 * @param renderTargets - Array of render targets to dispose on unmount
 *
 * @example
 * ```tsx
 * const renderTarget = useMemo(() => new THREE.WebGLRenderTarget(1024, 1024), []);
 *
 * useDisposeRenderTargets([renderTarget]);
 * ```
 */
export function useDisposeRenderTargets(
  renderTargets: (THREE.WebGLRenderTarget | null | undefined)[],
): void {
  useEffect(() => {
    return () => {
      for (const target of renderTargets) {
        target?.dispose();
      }
    };
  }, [renderTargets]);
}

// Helper to dispose an array of disposable resources
function disposeArray<T extends { dispose(): void }>(
  items: (T | null | undefined)[] | undefined,
): void {
  if (!items) return;
  for (const item of items) {
    item?.dispose();
  }
}

/**
 * Hook to dispose all Three.js resources on component unmount
 *
 * Convenience hook that combines material, geometry, and texture disposal.
 * Use this when a component creates multiple resource types.
 *
 * @param resources - Object containing arrays of resources to dispose
 *
 * @example
 * ```tsx
 * const material = useMemo(() => new THREE.ShaderMaterial({...}), []);
 * const geometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
 *
 * useDisposeResources({
 *   materials: [material],
 *   geometries: [geometry],
 * });
 * ```
 */
export function useDisposeResources(resources: {
  materials?: (THREE.Material | null | undefined)[];
  geometries?: (THREE.BufferGeometry | null | undefined)[];
  renderTargets?: (THREE.WebGLRenderTarget | null | undefined)[];
  textures?: (THREE.Texture | null | undefined)[];
}): void {
  useEffect(() => {
    return () => {
      disposeArray(resources.materials);
      disposeArray(resources.geometries);
      disposeArray(resources.renderTargets);
      disposeArray(resources.textures);
    };
  }, [resources]);
}
