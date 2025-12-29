import { useWorld } from 'koota/react';
import { useEffect } from 'react';
import { useSwarm } from '../ParticleSwarm';
import { JitterBehaviorTrait } from '../traits';

export interface JitterBehaviorProps {
  /**
   * Strength of the jitter/shiver effect.
   * @group "Jitter"
   * @min 0 @max 2 @step 0.1
   */
  strength?: number;
}

/**
 * JitterBehavior - Adds high-frequency vibration to the swarm.
 */
export function JitterBehavior({ strength = 1.0 }: JitterBehaviorProps) {
  const world = useWorld();
  const swarmEntity = useSwarm();

  useEffect(() => {
    try {
      if (world.has(swarmEntity)) {
        swarmEntity.set(JitterBehaviorTrait, {
          strength,
        });
      }
    } catch (_e) {
      // Ignore stale world errors
    }

    return () => {
      try {
        if (world.has(swarmEntity)) {
          swarmEntity.remove(JitterBehaviorTrait);
        }
      } catch (_e) {
        // Ignore stale world errors
      }
    };
  }, [swarmEntity, strength, world]);

  return null;
}
