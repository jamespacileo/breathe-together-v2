/**
 * FloatingPetals - Gentle floating petal-like shapes
 *
 * Creates soft, organic petal shapes that float and drift through
 * the scene like cherry blossoms or mystical energy fragments.
 *
 * Uses drei's Float component for smooth, natural floating motion.
 *
 * Features:
 * - Soft translucent petal geometry
 * - Natural tumbling rotation
 * - Float component for organic bobbing
 * - Breathing-synchronized opacity
 *
 * Performance: 15 instanced petals with shared geometry/material
 */

import { Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface FloatingPetalsProps {
  /** Number of petals @default 15 */
  count?: number;
  /** Maximum opacity @default 0.25 */
  opacity?: number;
  /** Enable petals @default true */
  enabled?: boolean;
}

interface PetalConfig {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
  floatSpeed: number;
  floatIntensity: number;
  rotationSpeed: number;
  floatRange: number;
}

// Petal configurations - distributed around the scene
const PETAL_CONFIGS: PetalConfig[] = [
  {
    id: 'petal-pink-1',
    position: [-8, 4, -15],
    rotation: [0.3, 0.5, 0.2],
    scale: 0.8,
    color: '#f8d4e4',
    floatSpeed: 0.8,
    floatIntensity: 0.5,
    rotationSpeed: 0.2,
    floatRange: 2,
  },
  {
    id: 'petal-purple-1',
    position: [10, -2, -20],
    rotation: [0.7, 0.2, 0.4],
    scale: 1.0,
    color: '#e4d8f4',
    floatSpeed: 0.6,
    floatIntensity: 0.6,
    rotationSpeed: 0.15,
    floatRange: 2.5,
  },
  {
    id: 'petal-mint-1',
    position: [-5, 6, -25],
    rotation: [0.1, 0.8, 0.3],
    scale: 0.6,
    color: '#d8f4e8',
    floatSpeed: 0.9,
    floatIntensity: 0.4,
    rotationSpeed: 0.25,
    floatRange: 1.5,
  },
  {
    id: 'petal-cream-1',
    position: [7, 3, -18],
    rotation: [0.5, 0.3, 0.6],
    scale: 0.9,
    color: '#f4e8d4',
    floatSpeed: 0.7,
    floatIntensity: 0.55,
    rotationSpeed: 0.18,
    floatRange: 2.2,
  },
  {
    id: 'petal-lavender-1',
    position: [-12, -3, -22],
    rotation: [0.4, 0.6, 0.1],
    scale: 0.7,
    color: '#e8d4f0',
    floatSpeed: 0.85,
    floatIntensity: 0.45,
    rotationSpeed: 0.22,
    floatRange: 1.8,
  },
  {
    id: 'petal-seafoam-1',
    position: [4, 7, -28],
    rotation: [0.6, 0.1, 0.5],
    scale: 1.1,
    color: '#d4f0e4',
    floatSpeed: 0.55,
    floatIntensity: 0.65,
    rotationSpeed: 0.12,
    floatRange: 2.8,
  },
  {
    id: 'petal-peach-1',
    position: [-9, 0, -16],
    rotation: [0.2, 0.7, 0.4],
    scale: 0.5,
    color: '#f0e4d8',
    floatSpeed: 0.95,
    floatIntensity: 0.35,
    rotationSpeed: 0.28,
    floatRange: 1.2,
  },
  {
    id: 'petal-sage-1',
    position: [12, 5, -24],
    rotation: [0.8, 0.4, 0.2],
    scale: 0.85,
    color: '#e4f0d8',
    floatSpeed: 0.65,
    floatIntensity: 0.5,
    rotationSpeed: 0.16,
    floatRange: 2.3,
  },
  {
    id: 'petal-sky-1',
    position: [-3, -5, -19],
    rotation: [0.3, 0.2, 0.7],
    scale: 0.75,
    color: '#d8e4f4',
    floatSpeed: 0.75,
    floatIntensity: 0.48,
    rotationSpeed: 0.2,
    floatRange: 2.0,
  },
  {
    id: 'petal-rose-1',
    position: [6, -4, -26],
    rotation: [0.5, 0.6, 0.3],
    scale: 0.95,
    color: '#f4d8e4',
    floatSpeed: 0.8,
    floatIntensity: 0.52,
    rotationSpeed: 0.17,
    floatRange: 2.4,
  },
  {
    id: 'petal-lime-1',
    position: [-11, 2, -21],
    rotation: [0.4, 0.3, 0.5],
    scale: 0.65,
    color: '#e4f4d8',
    floatSpeed: 0.88,
    floatIntensity: 0.42,
    rotationSpeed: 0.23,
    floatRange: 1.6,
  },
  {
    id: 'petal-teal-1',
    position: [9, -1, -17],
    rotation: [0.6, 0.5, 0.1],
    scale: 1.05,
    color: '#d8f0e8',
    floatSpeed: 0.58,
    floatIntensity: 0.58,
    rotationSpeed: 0.14,
    floatRange: 2.6,
  },
  {
    id: 'petal-blush-1',
    position: [-6, 5, -23],
    rotation: [0.1, 0.4, 0.6],
    scale: 0.55,
    color: '#f0d8e8',
    floatSpeed: 0.92,
    floatIntensity: 0.38,
    rotationSpeed: 0.26,
    floatRange: 1.4,
  },
  {
    id: 'petal-chartreuse-1',
    position: [3, -6, -20],
    rotation: [0.7, 0.1, 0.4],
    scale: 0.9,
    color: '#e8f0d4',
    floatSpeed: 0.68,
    floatIntensity: 0.54,
    rotationSpeed: 0.19,
    floatRange: 2.1,
  },
  {
    id: 'petal-ice-1',
    position: [-7, 1, -27],
    rotation: [0.2, 0.8, 0.3],
    scale: 0.7,
    color: '#d4e8f4',
    floatSpeed: 0.78,
    floatIntensity: 0.46,
    rotationSpeed: 0.21,
    floatRange: 1.9,
  },
];

const Petal = memo(function Petal({
  config,
  baseOpacity,
}: {
  config: PetalConfig;
  baseOpacity: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Create petal-like geometry (flattened sphere segment)
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Petal outline - teardrop/leaf shape
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.15, 0.1, 0.2, 0.3, 0.15, 0.5);
    shape.bezierCurveTo(0.1, 0.7, 0.05, 0.85, 0, 1);
    shape.bezierCurveTo(-0.05, 0.85, -0.1, 0.7, -0.15, 0.5);
    shape.bezierCurveTo(-0.2, 0.3, -0.15, 0.1, 0, 0);

    const geo = new THREE.ShapeGeometry(shape, 8);
    geo.center();
    return geo;
  }, []);

  // Animate rotation
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // Gentle tumbling rotation
    meshRef.current.rotation.x += config.rotationSpeed * 0.01;
    meshRef.current.rotation.y += config.rotationSpeed * 0.015;
    meshRef.current.rotation.z += config.rotationSpeed * 0.008;

    // Breathing-synchronized opacity
    const breathPhase = (Date.now() % 19000) / 19000;
    const breathMod = 0.6 + Math.sin(breathPhase * Math.PI * 2) * 0.4;

    // Gentle shimmer
    const shimmer = Math.sin(time * 1.5 + config.floatSpeed * 10) * 0.15 + 0.85;

    materialRef.current.opacity = baseOpacity * breathMod * shimmer;
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <Float
      speed={config.floatSpeed}
      floatIntensity={config.floatIntensity}
      rotationIntensity={0.1}
      floatingRange={[-config.floatRange * 0.5, config.floatRange * 0.5]}
    >
      <mesh
        ref={meshRef}
        position={config.position}
        rotation={config.rotation}
        scale={config.scale}
        geometry={geometry}
      >
        <meshBasicMaterial
          ref={materialRef}
          color={config.color}
          transparent
          opacity={baseOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </Float>
  );
});

export const FloatingPetals = memo(function FloatingPetals({
  count = 15,
  opacity = 0.25,
  enabled = true,
}: FloatingPetalsProps) {
  const configs = useMemo(() => PETAL_CONFIGS.slice(0, count), [count]);

  if (!enabled) return null;

  return (
    <group>
      {configs.map((config) => (
        <Petal key={config.id} config={config} baseOpacity={opacity} />
      ))}
    </group>
  );
});

export default FloatingPetals;
