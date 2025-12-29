import type { Entity } from 'koota';
import { useWorld } from 'koota/react';
import { createContext, useContext, useEffect, useState } from 'react';
import { ParticleSwarmTrait } from './traits';

const SwarmContext = createContext<Entity | null>(null);

export function useSwarm() {
  const context = useContext(SwarmContext);
  if (!context) {
    throw new Error('useSwarm must be used within a ParticleSwarm container');
  }
  return context;
}

export interface ParticleSwarmProps {
  /**
   * Total number of particles in this swarm.
   * @group "Configuration"
   * @min 100 @max 1000 @step 50
   */
  count?: number;

  /**
   * Minimum particle scale.
   * @group "Configuration"
   * @min 0.01 @max 0.2 @step 0.01
   */
  minScale?: number;

  /**
   * Maximum particle scale.
   * @group "Configuration"
   * @min 0.05 @max 0.5 @step 0.01
   */
  maxScale?: number;

  children?: React.ReactNode;
}

/**
 * ParticleSwarm - Container component that manages a swarm entity.
 * Provides the swarm entity to child layout and behavior components via context.
 */
export function ParticleSwarm({
  count = 300,
  minScale = 0.05,
  maxScale = 0.1,
  children,
}: ParticleSwarmProps) {
  const world = useWorld();
  const [swarmEntity, setSwarmEntity] = useState<Entity | null>(null);

  // Create Swarm Entity
  useEffect(() => {
    const entity = world.spawn(ParticleSwarmTrait({ count, minScale, maxScale }));
    setSwarmEntity(entity);

    return () => {
      if (world.has(entity)) {
        entity.destroy();
      }
      setSwarmEntity(null);
    };
  }, [world, minScale, maxScale, count]); // Only recreate if world changes

  // Update Swarm Trait
  useEffect(() => {
    try {
      if (swarmEntity && world.has(swarmEntity)) {
        swarmEntity.set(ParticleSwarmTrait, {
          count,
          minScale,
          maxScale,
        });
      }
    } catch (_e) {
      // Ignore stale world errors
    }
  }, [swarmEntity, count, minScale, maxScale, world]);

  if (!swarmEntity) return null;

  return <SwarmContext.Provider value={swarmEntity}>{children}</SwarmContext.Provider>;
}
