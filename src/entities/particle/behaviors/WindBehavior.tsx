import { useWorld } from 'koota/react';
import { useEffect } from 'react';
import { useSwarm } from '../ParticleSwarm';
import { WindBehaviorTrait } from '../traits';

export interface WindBehaviorProps {
  /**
   * Strength of the wind/turbulence.
   * @group "Wind"
   * @min 0 @max 5 @step 0.1
   */
  strength?: number;
}

/**
 * WindBehavior - Adds atmospheric turbulence to the swarm.
 */
export function WindBehavior({ strength = 1.0 }: WindBehaviorProps) {
  const world = useWorld();
  const swarmEntity = useSwarm();

  useEffect(() => {
    try {
      if (world.has(swarmEntity)) {
        swarmEntity.set(WindBehaviorTrait, {
          strength,
        });
      }
    } catch (_e) {
      // Ignore stale world errors
    }

    return () => {
      try {
        if (world.has(swarmEntity)) {
          swarmEntity.remove(WindBehaviorTrait);
        }
      } catch (_e) {
        // Ignore stale world errors
      }
    };
  }, [swarmEntity, strength, world]);

  return null;
}
