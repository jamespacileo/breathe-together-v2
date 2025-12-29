import { useWorld } from 'koota/react';
import { useEffect } from 'react';
import { useSwarm } from '../ParticleSwarm';
import { OrbitBehaviorTrait } from '../traits';

export interface OrbitBehaviorProps {
  /**
   * Minimum orbit radius.
   * @group "Orbit"
   * @min 0.1 @max 5.0 @step 0.1
   */
  minRadius?: number;

  /**
   * Maximum orbit radius.
   * @group "Orbit"
   * @min 1.0 @max 10.0 @step 0.1
   */
  maxRadius?: number;

  /**
   * Chaos/Spread multiplier.
   * @group "Orbit"
   * @min 0 @max 2 @step 0.1
   */
  spread?: number;
}

/**
 * OrbitBehavior - Configures the swarm to orbit around the center.
 */
export function OrbitBehavior({
  minRadius = 0.8,
  maxRadius = 6.0,
  spread = 1.0,
}: OrbitBehaviorProps) {
  const world = useWorld();
  const swarmEntity = useSwarm();

  useEffect(() => {
    try {
      if (world.has(swarmEntity)) {
        swarmEntity.set(OrbitBehaviorTrait, {
          minRadius,
          maxRadius,
          spread,
        });
      }
    } catch (_e) {
      // Ignore stale world errors
    }

    return () => {
      try {
        if (world.has(swarmEntity)) {
          swarmEntity.remove(OrbitBehaviorTrait);
        }
      } catch (_e) {
        // Ignore stale world errors
      }
    };
  }, [swarmEntity, minRadius, maxRadius, spread, world]);

  return null;
}
