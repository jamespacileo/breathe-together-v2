import { useEffect, useMemo } from 'react';

/**
 * Generic hook for managing Three.js resource disposal
 * Automatically disposes resources when component unmounts or dependencies change
 *
 * @example Single resource disposal:
 * ```typescript
 * const geometry = useDisposable(
 *   () => new THREE.IcosahedronGeometry(1, 0),
 *   (geo) => geo.dispose()
 * );
 * ```
 *
 * @example Multiple resource disposal:
 * ```typescript
 * const resources = useDisposable(
 *   () => ({
 *     geometry: new THREE.SphereGeometry(1),
 *     material: new THREE.MeshBasicMaterial({ color: 0xff0000 })
 *   }),
 *   (resources) => {
 *     resources.geometry.dispose();
 *     resources.material.dispose();
 *   }
 * );
 * ```
 *
 * @param factory Function that creates the resource(s)
 * @param dispose Function that disposes the resource(s)
 * @param deps Dependency array for resource recreation (optional)
 * @returns The created resource(s)
 */
export function useDisposable<T>(
  factory: () => T,
  dispose: (resource: T) => void,
  deps: React.DependencyList = [],
): T {
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps is parameter with default array value, caller ensures correctness
  const resource = useMemo(factory, deps);

  useEffect(() => {
    return () => {
      dispose(resource);
    };
  }, [resource, dispose]);

  return resource;
}
