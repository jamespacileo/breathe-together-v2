/**
 * BreathStars - Breath-synchronized starfield with crystallization-based rotation.
 * Stars rotate slower during breath holds (high crystallization), faster during transitions.
 */

import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef } from 'react';
import type * as THREE from 'three';
import { breathPhase, crystallization } from '../breath/traits';

interface BreathStarsProps {
  /**
   * Environment mood preset (affects star count)
   * @enum ["meditation", "cosmic", "minimal", "studio"]
   */
  preset?: 'meditation' | 'cosmic' | 'minimal' | 'studio';

  /**
   * Atmospheric density multiplier
   * @min 0
   * @max 1
   * @step 0.1
   */
  atmosphere?: number;
}

const STAR_CONFIGS = {
  meditation: {
    count: 3000,
    radius: 100,
    depth: 50,
    factor: 4,
  },
  cosmic: {
    count: 8000,
    radius: 100,
    depth: 50,
    factor: 4,
  },
  minimal: {
    count: 0,
    radius: 100,
    depth: 50,
    factor: 4,
  },
  studio: {
    count: 1000,
    radius: 100,
    depth: 50,
    factor: 4,
  },
} as const;

export function BreathStars({ preset = 'meditation', atmosphere = 0.5 }: BreathStarsProps) {
  const config = STAR_CONFIGS[preset];
  const starsRef = useRef<THREE.Group>(null);
  const world = useWorld();

  useFrame((_state, delta) => {
    try {
      const breathEntity = world.queryFirst(breathPhase, crystallization);
      if (!breathEntity || !world.has(breathEntity)) return;

      const cryst = breathEntity.get(crystallization)?.value ?? 0;

      // Modulate star speed based on stillness (crystallization)
      // Slower during holds (high crystallization), faster during transitions
      if (starsRef.current) {
        starsRef.current.rotation.y += delta * 0.05 * (1 - cryst);
      }
    } catch (_e) {
      // Silently catch ECS errors
    }
  });

  // Don't render stars if count is 0
  if (config.count === 0) return null;

  return (
    <group ref={starsRef}>
      <Stars
        radius={config.radius}
        depth={config.depth}
        count={Math.floor(config.count * atmosphere * 2)}
        factor={config.factor}
        saturation={0.2}
        fade
        speed={1}
      />
    </group>
  );
}
