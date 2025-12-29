import type { Entity } from 'koota';
import { useWorld } from 'koota/react';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { VISUALS } from '../../../constants';
import { generateFibonacciSphere, sphericalToCartesian } from '../../../lib/fibonacciSphere';
import { Acceleration, Mass, Position, Velocity } from '../../../shared/traits';
import { useSwarm } from '../ParticleSwarm';
import {
  color,
  index,
  offset,
  ownerId,
  ParticleSwarmTrait,
  parentSwarm,
  restPosition,
  seed,
  size,
  targetColor,
} from '../traits';

export interface FibonacciLayoutProps {
  /**
   * Maximum radius of the Fibonacci sphere.
   * @group "Configuration"
   * @min 1.0 @max 10.0 @step 0.1
   */
  radius?: number;
}

/**
 * FibonacciLayout - Spawns particles in a Fibonacci sphere distribution.
 */
export function FibonacciLayout({ radius = 6.0 }: FibonacciLayoutProps) {
  const world = useWorld();
  const swarmEntity = useSwarm();

  // Safely get swarm config
  const swarmConfig = world.has(swarmEntity) ? swarmEntity.get(ParticleSwarmTrait) : null;
  const count = swarmConfig?.count ?? 300;

  // Generate base layout
  const layout = useMemo(() => generateFibonacciSphere(count), [count]);

  // Spawn Particles
  useEffect(() => {
    const entities: Entity[] = [];
    try {
      const fillerColor = new THREE.Color(VISUALS.PARTICLE_FILLER_COLOR);
      const minScale = swarmConfig?.minScale ?? 0.05;
      const maxScale = swarmConfig?.maxScale ?? 0.1;

      for (let i = 0; i < count; i++) {
        const p = layout[i];
        const [x, y, z] = sphericalToCartesian(p.theta, p.phi, radius);

        // Map p.size (0.8 to 1.4) to [minScale, maxScale]
        const finalSize = minScale + (maxScale - minScale) * ((p.size - 0.8) / 0.6);

        const entity = world.spawn(
          Position({ x, y, z }),
          Velocity({ x: 0, y: 0, z: 0 }),
          Acceleration({ x: 0, y: 0, z: 0 }),
          Mass({ value: 1 }),
          restPosition({
            x: x / radius,
            y: y / radius,
            z: z / radius,
          }),
          offset({ x: 0, y: 0, z: 0 }),
          color({ r: fillerColor.r, g: fillerColor.g, b: fillerColor.b }),
          targetColor({ r: fillerColor.r, g: fillerColor.g, b: fillerColor.b }),
          size({ value: finalSize }),
          seed({ value: Math.random() * 1000 }),
          ownerId({ value: 'filler' }),
          index({ value: i }),
          parentSwarm({ value: swarmEntity }),
        );
        entities.push(entity);
      }
    } catch (_e) {
      // Ignore stale world errors
    }

    return () => {
      entities.forEach((e) => {
        try {
          if (world.has(e)) {
            e.destroy();
          }
        } catch (_err) {
          // Ignore stale world errors
        }
      });
    };
  }, [world, layout, count, swarmEntity, radius, swarmConfig?.minScale, swarmConfig?.maxScale]);

  return null;
}
