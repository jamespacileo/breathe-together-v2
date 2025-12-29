import { useWorld } from 'koota/react';
import { useEffect } from 'react';
import { useSwarm } from '../ParticleSwarm';
import { RepulsionBehaviorTrait } from '../traits';

export interface RepulsionBehaviorProps {
  /**
   * Strength of the sphere repulsion.
   * @group "Repulsion"
   * @min 0 @max 5 @step 0.1
   */
  strength?: number;

  /**
   * Distance from the sphere surface where repulsion starts.
   * @group "Repulsion"
   * @min 0 @max 2 @step 0.1
   */
  radiusOffset?: number;
}

/**
 * RepulsionBehavior - Prevents particles from entering the central sphere.
 */
export function RepulsionBehavior({ strength = 1.0, radiusOffset = 0.5 }: RepulsionBehaviorProps) {
  const world = useWorld();
  const swarmEntity = useSwarm();

  useEffect(() => {
    try {
      if (world.has(swarmEntity)) {
        swarmEntity.set(RepulsionBehaviorTrait, {
          strength,
          radiusOffset,
        });
      }
    } catch (_e) {
      // Ignore stale world errors
    }

    return () => {
      try {
        if (world.has(swarmEntity)) {
          swarmEntity.remove(RepulsionBehaviorTrait);
        }
      } catch (_e) {
        // Ignore stale world errors
      }
    };
  }, [swarmEntity, strength, radiusOffset, world]);

  return null;
}
