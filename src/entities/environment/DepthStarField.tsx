/**
 * DepthStarField - Multi-layer star field with depth stratification
 *
 * Creates stars at multiple depth layers to enhance the sense of vast space:
 * - Near stars: Brighter, larger, colored (warm tones)
 * - Mid stars: Medium brightness, white
 * - Far stars: Tiny, faint, dense field
 *
 * Each layer has different sizes, opacities, and subtle animation speeds.
 */

import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useRef } from 'react';
import type * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

interface StarLayerConfig {
  id: string;
  /** Sphere radius for star distribution */
  radius: number;
  /** Depth variation within the sphere */
  depth: number;
  /** Number of stars */
  count: number;
  /** Star size factor */
  factor: number;
  /** Color saturation (0 = white, 1 = colored) */
  saturation: number;
  /** Rotation speed */
  speed: number;
  /** Star color (when saturated) */
  color?: string;
}

// Star layer configurations
const STAR_LAYERS: StarLayerConfig[] = [
  {
    id: 'near-stars',
    radius: SCENE_DEPTH.STARS.NEAR.radius,
    depth: 15,
    count: SCENE_DEPTH.STARS.NEAR.count,
    factor: SCENE_DEPTH.STARS.NEAR.size,
    saturation: 0.3,
    speed: 0.3,
    color: '#ffe8d4',
  },
  {
    id: 'mid-stars',
    radius: SCENE_DEPTH.STARS.MID.radius,
    depth: 30,
    count: SCENE_DEPTH.STARS.MID.count,
    factor: SCENE_DEPTH.STARS.MID.size,
    saturation: 0.1,
    speed: 0.2,
  },
  {
    id: 'far-stars',
    radius: SCENE_DEPTH.STARS.FAR.radius,
    depth: 50,
    count: SCENE_DEPTH.STARS.FAR.count,
    factor: SCENE_DEPTH.STARS.FAR.size,
    saturation: 0,
    speed: 0.1,
  },
];

interface StarLayerProps {
  config: StarLayerConfig;
  globalOpacity: number;
}

/**
 * Individual star layer with subtle rotation animation
 */
const StarLayer = memo(function StarLayer({ config, globalOpacity }: StarLayerProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Very slow rotation for subtle parallax effect
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * config.speed * 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      <Stars
        radius={config.radius}
        depth={config.depth}
        count={config.count}
        factor={config.factor}
        saturation={config.saturation}
        fade
        speed={config.speed}
      />
    </group>
  );
});

export interface DepthStarFieldProps {
  /**
   * Enable depth star field
   * @default true
   */
  enabled?: boolean;
  /**
   * Global opacity multiplier
   * @default 1.0
   * @min 0
   * @max 2
   */
  opacity?: number;
  /**
   * Star count multiplier (affects performance)
   * @default 1.0
   * @min 0.25
   * @max 2
   */
  density?: number;
}

/**
 * DepthStarField - Creates depth through layered star fields
 *
 * Renders multiple star layers at different distances with varying
 * sizes and opacities to create atmospheric perspective in the night sky.
 */
export const DepthStarField = memo(function DepthStarField({
  enabled = true,
  opacity = 1.0,
  density = 1.0,
}: DepthStarFieldProps) {
  if (!enabled) return null;

  // Apply density multiplier
  const adjustedLayers = STAR_LAYERS.map((layer) => ({
    ...layer,
    count: Math.round(layer.count * density),
  }));

  return (
    <group name="DepthStarField">
      {adjustedLayers.map((config) => (
        <StarLayer key={config.id} config={config} globalOpacity={opacity} />
      ))}
    </group>
  );
});

export default DepthStarField;
