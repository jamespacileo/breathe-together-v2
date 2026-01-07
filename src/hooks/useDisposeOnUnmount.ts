import { useEffect } from 'react';

/**
 * Something that can release GPU/CPU resources via a `dispose()` method.
 */
export interface Disposable {
  dispose(): void;
}

/**
 * Dispose one or more Three.js resources when the component unmounts.
 *
 * This also disposes prior instances if any passed resource reference changes
 * (matching the common `useEffect(() => () => dispose(), [resource])` pattern).
 *
 * @param geometry - Geometry-like resource to clean up
 * @param material - Material-like resource to clean up
 *
 * @example
 * ```ts
 * const geometry = useMemo(() => new THREE.SphereGeometry(1), []);
 * const material = useMemo(() => new THREE.MeshBasicMaterial(), []);
 * useDisposeOnUnmount(geometry, material);
 * ```
 */
export function useDisposeOnUnmount(
  geometry: Disposable | null | undefined,
  material: Disposable | null | undefined,
): void {
  useEffect(() => {
    return () => {
      geometry?.dispose();
      material?.dispose();
    };
  }, [geometry, material]);
}
