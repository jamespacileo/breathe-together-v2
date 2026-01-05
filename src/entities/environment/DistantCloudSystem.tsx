/**
 * DistantCloudSystem - Far background clouds for depth perception
 *
 * Creates multiple layers of clouds at great distances (radius 20-65):
 * - Independent of MomentumControls (doesn't rotate with scene)
 * - Provides parallax depth when camera moves
 * - Slow drift animation for organic feel
 * - More saturated colors for visibility on light background
 *
 * Uses drei Cloud component for volumetric appearance.
 */

import { Cloud, Clouds } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

interface DistantCloudConfig {
  id: string;
  /** Position on sphere (phi, theta angles) */
  phi: number;
  theta: number;
  /** Distance from center */
  radius: number;
  color: string;
  opacity: number;
  segments: number;
  bounds: [number, number, number];
  volume: number;
  fade: number;
  /** Drift speed multiplier */
  driftSpeed: number;
  /** Vertical bob amplitude */
  bobAmount: number;
}

interface DistantCloudSystemProps {
  /** Enable/disable distant clouds @default true */
  enabled?: boolean;
  /** Base opacity @default 0.3 */
  opacity?: number;
  /** Movement speed @default 0.5 */
  speed?: number;
}

// Color palette for distant clouds - more saturated for visibility
const DISTANT_CLOUD_COLORS = [
  '#c4a8d4', // Soft purple
  '#a8c4d4', // Soft teal
  '#d4b8a8', // Warm taupe
  '#b8d4c4', // Sage green
  '#d4a8b8', // Dusty rose
  '#a8b8d4', // Periwinkle
];

/**
 * Generate cloud configurations for a layer
 */
function generateLayerClouds(
  layerIndex: number,
  radius: number,
  count: number,
  baseOpacity: number,
  scale: number,
): DistantCloudConfig[] {
  const clouds: DistantCloudConfig[] = [];

  for (let i = 0; i < count; i++) {
    // Golden angle distribution for even spacing
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = goldenAngle * i;

    // Add some randomness to radius
    const finalRadius = radius * (0.9 + Math.random() * 0.2);

    // Random color from palette
    const color = DISTANT_CLOUD_COLORS[Math.floor(Math.random() * DISTANT_CLOUD_COLORS.length)];

    clouds.push({
      id: `distant-cloud-L${layerIndex}-${i}`,
      phi,
      theta,
      radius: finalRadius,
      color,
      opacity: baseOpacity * (0.5 + Math.random() * 0.5),
      segments: Math.floor(12 + Math.random() * 8),
      bounds: [
        scale * (2 + Math.random() * 2),
        scale * (0.8 + Math.random() * 0.4),
        scale * (1.5 + Math.random()),
      ],
      volume: 2 + Math.random() * 2,
      fade: 8 + Math.random() * 8,
      driftSpeed: 0.002 + Math.random() * 0.003,
      bobAmount: 0.1 + Math.random() * 0.2,
    });
  }

  return clouds;
}

// Reusable vector for position calculation
const _tempPos = new THREE.Vector3();

/**
 * Individual distant cloud with gentle animation
 */
const DistantCloud = memo(function DistantCloud({
  config,
  baseOpacity,
  baseSpeed,
}: {
  config: DistantCloudConfig;
  baseOpacity: number;
  baseSpeed: number;
}) {
  const cloudRef = useRef<THREE.Group>(null);
  const timeOffset = useRef(Math.random() * 100);

  // Calculate initial position from spherical coords
  const initialPosition = useMemo(() => {
    _tempPos.setFromSphericalCoords(config.radius, config.phi, config.theta);
    return _tempPos.clone();
  }, [config.radius, config.phi, config.theta]);

  // Animate drift and bob
  useFrame((state) => {
    if (!cloudRef.current) return;

    const time = state.clock.elapsedTime + timeOffset.current;

    // Slow orbital drift
    const driftAngle = time * config.driftSpeed * baseSpeed;

    // Calculate drifted position
    _tempPos.setFromSphericalCoords(
      config.radius,
      config.phi + Math.sin(time * 0.1) * 0.05,
      config.theta + driftAngle,
    );

    // Add vertical bob
    const bob = Math.sin(time * 0.3) * config.bobAmount;

    cloudRef.current.position.set(_tempPos.x, _tempPos.y + bob, _tempPos.z);
  });

  const finalOpacity = config.opacity * baseOpacity;

  return (
    <group ref={cloudRef} position={[initialPosition.x, initialPosition.y, initialPosition.z]}>
      <Cloud
        opacity={finalOpacity}
        speed={0.1}
        segments={config.segments}
        bounds={config.bounds}
        volume={config.volume}
        color={config.color}
        fade={config.fade}
      />
    </group>
  );
});

/**
 * DistantCloudSystem - Multiple layers of distant background clouds
 *
 * Placed outside MomentumControls so clouds don't rotate with the scene.
 * Creates depth through parallax as camera moves.
 */
export const DistantCloudSystem = memo(function DistantCloudSystem({
  enabled = true,
  opacity = 0.3,
  speed = 0.5,
}: DistantCloudSystemProps) {
  // Generate all cloud configs using constants
  const allClouds = useMemo(() => {
    const { LAYER_1, LAYER_2, LAYER_3, LAYER_4 } = SCENE_DEPTH.DISTANT_CLOUDS;

    return [
      ...generateLayerClouds(1, LAYER_1.radius, LAYER_1.count, LAYER_1.opacity, LAYER_1.scale),
      ...generateLayerClouds(2, LAYER_2.radius, LAYER_2.count, LAYER_2.opacity, LAYER_2.scale),
      ...generateLayerClouds(3, LAYER_3.radius, LAYER_3.count, LAYER_3.opacity, LAYER_3.scale),
      ...generateLayerClouds(4, LAYER_4.radius, LAYER_4.count, LAYER_4.opacity, LAYER_4.scale),
    ];
  }, []);

  if (!enabled) return null;

  return (
    <Clouds material={THREE.MeshBasicMaterial}>
      {allClouds.map((config) => (
        <DistantCloud key={config.id} config={config} baseOpacity={opacity} baseSpeed={speed} />
      ))}
    </Clouds>
  );
});

export default DistantCloudSystem;
