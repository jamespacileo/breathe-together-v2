import { useEffect, useLayoutEffect, useRef } from 'react';
import type * as THREE from 'three';

/**
 * Hook to dispose Three.js materials on component unmount
 *
 * Three.js materials consume GPU memory and must be manually disposed
 * when no longer needed. This hook provides a clean way to register
 * materials for automatic cleanup when the component unmounts.
 *
 * Uses a ref-based approach to avoid issues with array reference changes,
 * so you can safely pass inline arrays.
 *
 * @param materials - Array of materials to dispose on unmount
 *
 * @example
 * ```tsx
 * const material = useMemo(() => new THREE.ShaderMaterial({...}), []);
 * const glowMaterial = useMemo(() => new THREE.MeshBasicMaterial({...}), []);
 *
 * // Automatically disposed when component unmounts
 * // No need to memoize the array - ref-based implementation handles this
 * useDisposeMaterials([material, glowMaterial]);
 *
 * return <mesh material={material} />;
 * ```
 */
export function useDisposeMaterials(materials: (THREE.Material | null | undefined)[]): void {
  const materialsRef = useRef<(THREE.Material | null | undefined)[]>([]);

  // Update ref synchronously with render
  useLayoutEffect(() => {
    materialsRef.current = materials;
  }, [materials]);

  // Cleanup only on unmount
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
  const geometriesRef = useRef<(THREE.BufferGeometry | null | undefined)[]>([]);

  useLayoutEffect(() => {
    geometriesRef.current = geometries;
  }, [geometries]);

  useEffect(() => {
    return () => {
      for (const geometry of geometriesRef.current) {
        geometry?.dispose();
      }
    };
  }, []);
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
  const texturesRef = useRef<(THREE.Texture | null | undefined)[]>([]);

  useLayoutEffect(() => {
    texturesRef.current = textures;
  }, [textures]);

  useEffect(() => {
    return () => {
      for (const texture of texturesRef.current) {
        texture?.dispose();
      }
    };
  }, []);
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
  const renderTargetsRef = useRef<(THREE.WebGLRenderTarget | null | undefined)[]>([]);

  useLayoutEffect(() => {
    renderTargetsRef.current = renderTargets;
  }, [renderTargets]);

  useEffect(() => {
    return () => {
      for (const target of renderTargetsRef.current) {
        target?.dispose();
      }
    };
  }, []);
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
  const resourcesRef = useRef<
    ({ dispose?: () => void } | null | undefined)[] | { dispose?: () => void } | null | undefined
  >(resources);
  const disposeMethodRef = useRef(disposeMethod);

  useLayoutEffect(() => {
    resourcesRef.current = resources;
    disposeMethodRef.current = disposeMethod;
  }, [resources, disposeMethod]);

  useEffect(() => {
    return () => {
      const currentResources = resourcesRef.current;
      const currentMethod = disposeMethodRef.current;
      const resourceArray = Array.isArray(currentResources) ? currentResources : [currentResources];

      for (const resource of resourceArray) {
        if (resource && typeof resource[currentMethod as keyof typeof resource] === 'function') {
          (resource[currentMethod as keyof typeof resource] as () => void)();
        }
      }
    };
  }, []);
}
