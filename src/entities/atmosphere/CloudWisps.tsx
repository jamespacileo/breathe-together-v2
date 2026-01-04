/**
 * CloudWisps - Delicate, wispy cloud formations around the atmosphere
 *
 * Features:
 * - Lighter, more ethereal than the main CloudSystem
 * - Positioned at atmosphere boundary
 * - Gentle opacity breathing with the cycle
 * - Soft pastel colors
 *
 * Different from CloudSystem: smaller, faster, more transparent
 */

import { Cloud, Clouds } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

interface WispConfig {
  id: string;
  position: [number, number, number];
  color: string;
  baseOpacity: number;
  bounds: [number, number, number];
  segments: number;
  rotationSpeed: number;
  phaseOffset: number;
}

export interface CloudWispsProps {
  /**
   * Base opacity of wisps
   * @default 0.25
   * @min 0
   * @max 0.5
   */
  opacity?: number;

  /**
   * Radius from center where wisps appear
   * @default 5.5
   * @min 3
   * @max 10
   */
  radius?: number;

  /**
   * Enable cloud wisps
   * @default true
   */
  enabled?: boolean;
}

// Wisp configurations - positioned around the atmosphere boundary
const WISP_CONFIGS: WispConfig[] = [
  {
    id: 'wisp-top',
    position: [0, 5.5, 0],
    color: '#f0e8ff',
    baseOpacity: 0.2,
    bounds: [3, 0.5, 2],
    segments: 12,
    rotationSpeed: 0.05,
    phaseOffset: 0,
  },
  {
    id: 'wisp-right',
    position: [4, 2, 3],
    color: '#ffe8f0',
    baseOpacity: 0.18,
    bounds: [2, 0.4, 1.5],
    segments: 10,
    rotationSpeed: 0.04,
    phaseOffset: 1,
  },
  {
    id: 'wisp-left',
    position: [-3.5, 1, 4],
    color: '#e8f0ff',
    baseOpacity: 0.22,
    bounds: [2.5, 0.5, 1.5],
    segments: 11,
    rotationSpeed: -0.03,
    phaseOffset: 2,
  },
  {
    id: 'wisp-back',
    position: [0, 3, -5],
    color: '#fff0e8',
    baseOpacity: 0.15,
    bounds: [3, 0.4, 2],
    segments: 10,
    rotationSpeed: 0.035,
    phaseOffset: 1.5,
  },
  {
    id: 'wisp-front-low',
    position: [2, -1, 5],
    color: '#e8fff0',
    baseOpacity: 0.2,
    bounds: [2, 0.3, 1.5],
    segments: 9,
    rotationSpeed: -0.04,
    phaseOffset: 0.5,
  },
  {
    id: 'wisp-bottom',
    position: [-2, -4, 2],
    color: '#f8f0ff',
    baseOpacity: 0.16,
    bounds: [2.5, 0.4, 2],
    segments: 10,
    rotationSpeed: 0.025,
    phaseOffset: 2.5,
  },
];

const AnimatedWisp = memo(function AnimatedWisp({
  config,
  baseOpacity,
}: {
  config: WispConfig;
  baseOpacity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();
  const timeRef = useRef(config.phaseOffset * 10);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    timeRef.current += delta;

    // Gentle rotation around Y axis
    groupRef.current.rotation.y += config.rotationSpeed * delta;

    // Breathing-based scale
    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      // Wisps expand slightly on inhale, contract on exhale
      const scale = 1 + phase * 0.2;
      groupRef.current.scale.setScalar(scale);
    }
  });

  const finalOpacity = config.baseOpacity * baseOpacity;

  return (
    <group ref={groupRef} position={config.position}>
      <Cloud
        opacity={finalOpacity}
        speed={0.2}
        segments={config.segments}
        bounds={config.bounds}
        volume={1.5}
        color={config.color}
        fade={8}
      />
    </group>
  );
});

/**
 * CloudWisps - Delicate atmosphere-boundary clouds
 */
export const CloudWisps = memo(function CloudWisps({
  opacity = 0.25,
  radius = 5.5,
  enabled = true,
}: CloudWispsProps) {
  // Scale wisp positions based on radius
  const scaledConfigs = useMemo(() => {
    const scale = radius / 5.5;
    return WISP_CONFIGS.map((config) => ({
      ...config,
      position: config.position.map((v) => v * scale) as [number, number, number],
    }));
  }, [radius]);

  if (!enabled) return null;

  return (
    <Clouds material={THREE.MeshBasicMaterial}>
      {scaledConfigs.map((config) => (
        <AnimatedWisp key={config.id} config={config} baseOpacity={opacity} />
      ))}
    </Clouds>
  );
});

export default CloudWisps;
