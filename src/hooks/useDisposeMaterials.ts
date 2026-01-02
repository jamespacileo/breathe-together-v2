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
 * Hook to dispose Three.js textures on component unmount
 *
 * Three.js textures consume GPU memory (image data) and must be
 * manually disposed when no longer needed.
 *
 * @param textures - Array of textures to dispose on unmount
 *
 * @example
 * ```tsx
 * const texture = useMemo(() => new THREE.DataTexture(data, w, h), []);
 *
 * useDisposeTextures([texture]);
 *
 * return <mesh><meshBasicMaterial map={texture} /></mesh>;
 * ```
 */
export function useDisposeTextures(textures: (THREE.Texture | null | undefined)[]): void {
  useEffect(() => {
    return () => {
      for (const texture of textures) {
        texture?.dispose();
      }
    };
  }, [textures]);
}

/**
 * Hook to dispose Three.js render targets on component unmount
 *
 * WebGLRenderTargets consume significant GPU memory (framebuffers, textures,
 * depth buffers) and must be manually disposed when no longer needed.
 *
 * @param renderTargets - Array of render targets to dispose on unmount
 *
 * @example
 * ```tsx
 * const fbo = useMemo(
 *   () => new THREE.WebGLRenderTarget(width, height),
 *   [width, height]
 * );
 *
 * useDisposeRenderTargets([fbo]);
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

/**
 * Generic disposal hook for any Three.js resource with a dispose method
 *
 * Provides a flexible way to dispose any Three.js object or custom resource
 * that implements the dispose pattern.
 *
 * @param resources - Array of resources with dispose methods
 * @param disposeMethod - Name of the disposal method (default: 'dispose')
 *
 * @example
 * ```tsx
 * const mesh = useMemo(() => new THREE.Mesh(geo, mat), []);
 *
 * // Generic disposal
 * useDispose([mesh]);
 *
 * // Custom disposal method
 * useDispose([customResource], 'cleanup');
 * ```
 */
export function useDispose(
  resources:
    | ({ dispose?: () => void } | null | undefined)[]
    | { dispose?: () => void }
    | null
    | undefined,
  disposeMethod: string = 'dispose',
): void {
  useEffect(() => {
    return () => {
      const resourceArray = Array.isArray(resources) ? resources : [resources];
      for (const resource of resourceArray) {
        if (resource && typeof resource[disposeMethod as keyof typeof resource] === 'function') {
          (resource[disposeMethod as keyof typeof resource] as () => void)();
        }
      }
    };
  }, [resources, disposeMethod]);
}
