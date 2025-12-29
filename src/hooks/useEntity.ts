import type { Entity, Trait } from 'koota';
import { useWorld } from 'koota/react';
import { useEffect } from 'react';

/**
 * Hook for spawning and destroying an entity with the given traits.
 * Eliminates boilerplate for: useEffect(() => { const entity = world.spawn(...); return () => entity.destroy(); }, [world])
 *
 * @param traitsFactory - Function that returns the traits array to spawn. Called with the world context.
 * @param dependencies - Additional dependencies for the effect
 * @returns The spawned entity (or null if world is not available)
 */
export function useEntity(
  traitsFactory: (world: ReturnType<typeof useWorld>) => Trait[],
  dependencies: unknown[] = [],
): Entity | null {
  const world = useWorld();

  useEffect(() => {
    try {
      const traits = traitsFactory(world);
      const entity = world.spawn(...traits);
      return () => {
        try {
          if (world.has(entity)) {
            entity.destroy();
          }
        } catch (_e) {
          // Ignore stale world errors
        }
      };
    } catch (_e) {
      // Ignore stale world errors
      return () => {};
    }
  }, [world, ...dependencies, traitsFactory]);

  return null; // We don't return the entity since it changes on every render cycle
}
