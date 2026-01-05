/**
 * DepthAtmosphericLayers - Multi-layer atmospheric particles at different Z-depths
 *
 * Creates a sense of vast 3D space by placing subtle floating particles
 * at multiple depth layers, each with varying opacity, size, and drift speed.
 *
 * Layers:
 * - Near layer (Z: -15): Larger, brighter motes, faster drift
 * - Mid layer (Z: -40): Medium particles, slower drift
 * - Far layer (Z: -80): Tiny pinpricks, very slow, faint
 * - Deep layer (Z: -120): Barely visible, creates depth floor
 */

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useRef } from 'react';
import type * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';
import { breathPhase } from '../breath/traits';

interface DepthLayerConfig {
  id: string;
  /** Z position of this layer */
  zPosition: number;
  /** Particle count */
  count: number;
  /** Distribution scale (X, Y spread) */
  scale: number;
  /** Particle size */
  size: number;
  /** Base opacity */
  opacity: number;
  /** Movement speed */
  speed: number;
  /** Particle color */
  color: string;
  /** Breathing opacity influence (0-1) */
  breathInfluence: number;
}

// Layer configurations from near to far - ENHANCED visibility
const DEPTH_LAYERS: DepthLayerConfig[] = [
  {
    id: 'near-dust',
    zPosition: SCENE_DEPTH.LAYERS.NEAR_BG.z,
    count: 80,
    scale: 25,
    size: 0.2, // Increased from 0.12
    opacity: 0.4, // Increased from 0.15
    speed: 0.8,
    color: '#f0d8c0', // Warmer, more visible
    breathInfluence: 0.3,
  },
  {
    id: 'mid-motes',
    zPosition: SCENE_DEPTH.LAYERS.MID_BG.z,
    count: 120,
    scale: 40,
    size: 0.15, // Increased from 0.08
    opacity: 0.3, // Increased from 0.1
    speed: 0.5,
    color: '#c8e0f0', // More visible blue tint
    breathInfluence: 0.2,
  },
  {
    id: 'far-particles',
    zPosition: SCENE_DEPTH.LAYERS.FAR_BG.z,
    count: 180,
    scale: 60,
    size: 0.1, // Increased from 0.05
    opacity: 0.2, // Increased from 0.06
    speed: 0.3,
    color: '#90b8d8', // More saturated blue
    breathInfluence: 0.1,
  },
  {
    id: 'deep-dust',
    zPosition: SCENE_DEPTH.LAYERS.DEEP_BG.z,
    count: 250,
    scale: 80,
    size: 0.06, // Increased from 0.03
    opacity: 0.12, // Increased from 0.03
    speed: 0.15,
    color: '#7898b8', // More saturated
    breathInfluence: 0.05,
  },
];

interface AtmosphericLayerProps {
  config: DepthLayerConfig;
}

/**
 * Individual atmospheric layer with breathing synchronization
 */
const AtmosphericLayer = memo(function AtmosphericLayer({ config }: AtmosphericLayerProps) {
  const sparklesRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const world = useWorld();

  // Breathing-synchronized opacity
  useFrame(() => {
    if (!sparklesRef.current) return;

    if (!materialRef.current) {
      materialRef.current = sparklesRef.current.material as THREE.PointsMaterial;
    }

    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity && materialRef.current) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      const breathEffect = phase * config.breathInfluence;
      materialRef.current.opacity = config.opacity + breathEffect * 0.1;
    }
  });

  return (
    <group position={[0, 0, config.zPosition]}>
      <Sparkles
        ref={sparklesRef}
        count={config.count}
        scale={config.scale}
        size={config.size}
        speed={config.speed}
        opacity={config.opacity}
        color={config.color}
      />
    </group>
  );
});

export interface DepthAtmosphericLayersProps {
  /**
   * Enable depth atmospheric layers
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
   * Global particle count multiplier (affects performance)
   * @default 1.0
   * @min 0.25
   * @max 2
   */
  density?: number;
}

/**
 * DepthAtmosphericLayers - Creates depth through layered atmospheric particles
 *
 * Renders multiple layers of floating particles at different Z-depths,
 * creating atmospheric perspective and a sense of vast 3D space.
 */
export const DepthAtmosphericLayers = memo(function DepthAtmosphericLayers({
  enabled = true,
  opacity = 1.0,
  density = 1.0,
}: DepthAtmosphericLayersProps) {
  if (!enabled) return null;

  // Apply multipliers to layer configs
  const adjustedLayers = DEPTH_LAYERS.map((layer) => ({
    ...layer,
    count: Math.round(layer.count * density),
    opacity: layer.opacity * opacity,
  }));

  return (
    <group name="DepthAtmosphericLayers">
      {adjustedLayers.map((config) => (
        <AtmosphericLayer key={config.id} config={config} />
      ))}
    </group>
  );
});

export default DepthAtmosphericLayers;
