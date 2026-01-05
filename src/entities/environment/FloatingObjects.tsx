/**
 * FloatingObjects - Animated geometric shapes at various depths
 *
 * Creates gentle movement throughout the scene with:
 * - Small geometric primitives (tetrahedra, octahedra, cubes)
 * - Multiple depth layers for parallax
 * - Slow rotation and drift animation
 * - Soft, pastel colors that complement the scene
 *
 * Adds life and movement without being distracting.
 */

import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface FloatingObjectConfig {
  id: string;
  position: [number, number, number];
  type: 'tetra' | 'octa' | 'cube' | 'dodeca';
  scale: number;
  color: string;
  opacity: number;
  rotationSpeed: [number, number, number];
  driftSpeed: number;
  driftAmplitude: number;
  phaseOffset: number;
}

interface FloatingObjectsProps {
  /** Enable/disable floating objects @default true */
  enabled?: boolean;
  /** Base opacity @default 0.3 */
  opacity?: number;
  /** Movement speed multiplier @default 1 */
  speed?: number;
  /** Number of objects per layer @default 8 */
  countPerLayer?: number;
}

// Color palette - soft, muted pastels
const OBJECT_COLORS = [
  '#a8c4d4', // Soft teal
  '#c4a8d4', // Soft purple
  '#d4c4a8', // Soft gold
  '#a8d4c4', // Soft mint
  '#d4a8b8', // Soft rose
  '#b8c4d4', // Soft blue-gray
];

// Object types with their geometries
const GEOMETRY_TYPES = ['tetra', 'octa', 'cube', 'dodeca'] as const;

/**
 * Generate floating object configurations
 */
function generateObjects(countPerLayer: number): FloatingObjectConfig[] {
  const objects: FloatingObjectConfig[] = [];

  // Layer configuration: depth, count multiplier, scale range
  const layers = [
    { zMin: -10, zMax: -20, scaleMult: 1.0, opacityMult: 0.5 },
    { zMin: -25, zMax: -45, scaleMult: 1.3, opacityMult: 0.35 },
    { zMin: -50, zMax: -80, scaleMult: 1.8, opacityMult: 0.25 },
    { zMin: -90, zMax: -130, scaleMult: 2.5, opacityMult: 0.15 },
  ];

  let id = 0;
  for (const layer of layers) {
    const count = Math.floor(countPerLayer * (1 + layers.indexOf(layer) * 0.5));

    for (let i = 0; i < count; i++) {
      const z = layer.zMin + Math.random() * (layer.zMax - layer.zMin);
      const spread = Math.abs(z) * 0.8;

      objects.push({
        id: `float-obj-${id++}`,
        position: [(Math.random() - 0.5) * spread * 2, (Math.random() - 0.5) * spread, z],
        type: GEOMETRY_TYPES[Math.floor(Math.random() * GEOMETRY_TYPES.length)],
        scale: (0.1 + Math.random() * 0.15) * layer.scaleMult,
        color: OBJECT_COLORS[Math.floor(Math.random() * OBJECT_COLORS.length)],
        opacity: (0.2 + Math.random() * 0.3) * layer.opacityMult,
        rotationSpeed: [
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.2,
        ],
        driftSpeed: 0.1 + Math.random() * 0.2,
        driftAmplitude: 0.3 + Math.random() * 0.5,
        phaseOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  return objects;
}

/**
 * Individual floating object with animation
 */
const FloatingObject = memo(function FloatingObject({
  config,
  baseOpacity,
  baseSpeed,
}: {
  config: FloatingObjectConfig;
  baseOpacity: number;
  baseSpeed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const initialPos = useRef(new THREE.Vector3(...config.position));

  // Create geometry based on type
  const geometry = useMemo(() => {
    switch (config.type) {
      case 'tetra':
        return new THREE.TetrahedronGeometry(1, 0);
      case 'octa':
        return new THREE.OctahedronGeometry(1, 0);
      case 'cube':
        return new THREE.BoxGeometry(1, 1, 1);
      case 'dodeca':
        return new THREE.DodecahedronGeometry(1, 0);
      default:
        return new THREE.OctahedronGeometry(1, 0);
    }
  }, [config.type]);

  // Animate rotation and drift
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime + config.phaseOffset;

    // Rotation
    meshRef.current.rotation.x += config.rotationSpeed[0] * baseSpeed * 0.01;
    meshRef.current.rotation.y += config.rotationSpeed[1] * baseSpeed * 0.01;
    meshRef.current.rotation.z += config.rotationSpeed[2] * baseSpeed * 0.01;

    // Gentle drift
    const driftX = Math.sin(time * config.driftSpeed * baseSpeed) * config.driftAmplitude;
    const driftY =
      Math.cos(time * config.driftSpeed * 0.7 * baseSpeed) * config.driftAmplitude * 0.5;

    meshRef.current.position.x = initialPos.current.x + driftX;
    meshRef.current.position.y = initialPos.current.y + driftY;
  });

  const finalOpacity = config.opacity * baseOpacity;

  return (
    <mesh ref={meshRef} position={config.position} scale={config.scale} geometry={geometry}>
      <meshBasicMaterial
        color={config.color}
        transparent
        opacity={finalOpacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
});

/**
 * FloatingObjects - Collection of animated geometric shapes
 *
 * Adds gentle movement and life to the scene at various depths.
 */
export const FloatingObjects = memo(function FloatingObjects({
  enabled = true,
  opacity = 0.3,
  speed = 1,
  countPerLayer = 8,
}: FloatingObjectsProps) {
  // Generate object configurations once
  const objects = useMemo(() => generateObjects(countPerLayer), [countPerLayer]);

  if (!enabled) return null;

  return (
    <group name="floating-objects">
      {objects.map((config) => (
        <FloatingObject key={config.id} config={config} baseOpacity={opacity} baseSpeed={speed} />
      ))}
    </group>
  );
});

export default FloatingObjects;
