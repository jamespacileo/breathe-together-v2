/**
 * FloatingObjects - Animated geometric shapes that populate the scene
 *
 * Creates moving crystalline/geometric objects at various depths:
 * - Small crystals floating near the globe
 * - Medium orbs drifting in mid-distance
 * - Large ethereal shapes in the far background
 *
 * All objects respond to the breathing cycle for cohesive animation.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';
import { breathPhase } from '../breath/traits';

interface FloatingObjectConfig {
  id: string;
  /** Object type */
  type: 'crystal' | 'orb' | 'ring' | 'diamond';
  /** Initial position [x, y, z] */
  position: [number, number, number];
  /** Scale */
  scale: number;
  /** Color */
  color: string;
  /** Opacity */
  opacity: number;
  /** Rotation speed [x, y, z] radians/second */
  rotationSpeed: [number, number, number];
  /** Orbit radius (0 = stationary) */
  orbitRadius: number;
  /** Orbit speed */
  orbitSpeed: number;
  /** Vertical bob amplitude */
  bobAmount: number;
  /** Vertical bob speed */
  bobSpeed: number;
  /** Breath influence (0-1) */
  breathInfluence: number;
}

// Floating object configurations
const FLOATING_OBJECTS: FloatingObjectConfig[] = [
  // Near objects (small, fast-moving)
  {
    id: 'crystal-1',
    type: 'crystal',
    position: [8, 3, -10],
    scale: 0.3,
    color: '#f8d0c0',
    opacity: 0.6,
    rotationSpeed: [0.3, 0.5, 0.2],
    orbitRadius: 2,
    orbitSpeed: 0.15,
    bobAmount: 0.8,
    bobSpeed: 0.4,
    breathInfluence: 0.3,
  },
  {
    id: 'crystal-2',
    type: 'crystal',
    position: [-6, -2, -12],
    scale: 0.25,
    color: '#c8d8f0',
    opacity: 0.55,
    rotationSpeed: [0.4, 0.3, 0.5],
    orbitRadius: 1.5,
    orbitSpeed: 0.12,
    bobAmount: 0.6,
    bobSpeed: 0.35,
    breathInfluence: 0.25,
  },
  {
    id: 'diamond-1',
    type: 'diamond',
    position: [5, 5, -8],
    scale: 0.2,
    color: '#e8c8d8',
    opacity: 0.5,
    rotationSpeed: [0.2, 0.6, 0.3],
    orbitRadius: 1.8,
    orbitSpeed: 0.1,
    bobAmount: 0.5,
    bobSpeed: 0.3,
    breathInfluence: 0.35,
  },
  {
    id: 'orb-1',
    type: 'orb',
    position: [-4, 4, -15],
    scale: 0.35,
    color: '#d8e0c8',
    opacity: 0.45,
    rotationSpeed: [0.1, 0.2, 0.1],
    orbitRadius: 2.5,
    orbitSpeed: 0.08,
    bobAmount: 1.0,
    bobSpeed: 0.25,
    breathInfluence: 0.4,
  },

  // Mid-distance objects (medium, slower)
  {
    id: 'ring-1',
    type: 'ring',
    position: [15, 0, -35],
    scale: 0.8,
    color: '#f0d8c0',
    opacity: 0.35,
    rotationSpeed: [0.15, 0.25, 0.1],
    orbitRadius: 4,
    orbitSpeed: 0.05,
    bobAmount: 1.5,
    bobSpeed: 0.15,
    breathInfluence: 0.2,
  },
  {
    id: 'crystal-3',
    type: 'crystal',
    position: [-12, 6, -40],
    scale: 0.6,
    color: '#d0c8e8',
    opacity: 0.3,
    rotationSpeed: [0.2, 0.15, 0.25],
    orbitRadius: 3,
    orbitSpeed: 0.06,
    bobAmount: 1.2,
    bobSpeed: 0.18,
    breathInfluence: 0.25,
  },
  {
    id: 'diamond-2',
    type: 'diamond',
    position: [10, -4, -45],
    scale: 0.5,
    color: '#e0d0c0',
    opacity: 0.28,
    rotationSpeed: [0.1, 0.3, 0.15],
    orbitRadius: 3.5,
    orbitSpeed: 0.04,
    bobAmount: 1.0,
    bobSpeed: 0.12,
    breathInfluence: 0.18,
  },
  {
    id: 'orb-2',
    type: 'orb',
    position: [-8, -3, -38],
    scale: 0.7,
    color: '#c8e0d8',
    opacity: 0.32,
    rotationSpeed: [0.05, 0.1, 0.08],
    orbitRadius: 5,
    orbitSpeed: 0.03,
    bobAmount: 2.0,
    bobSpeed: 0.1,
    breathInfluence: 0.22,
  },

  // Far background objects (large, very slow, ethereal)
  {
    id: 'crystal-4',
    type: 'crystal',
    position: [25, 8, -70],
    scale: 1.2,
    color: '#e8e0d8',
    opacity: 0.2,
    rotationSpeed: [0.08, 0.12, 0.06],
    orbitRadius: 6,
    orbitSpeed: 0.02,
    bobAmount: 2.5,
    bobSpeed: 0.06,
    breathInfluence: 0.15,
  },
  {
    id: 'ring-2',
    type: 'ring',
    position: [-20, -5, -80],
    scale: 1.5,
    color: '#d8d0e0',
    opacity: 0.18,
    rotationSpeed: [0.06, 0.1, 0.04],
    orbitRadius: 8,
    orbitSpeed: 0.015,
    bobAmount: 3.0,
    bobSpeed: 0.05,
    breathInfluence: 0.12,
  },
  {
    id: 'diamond-3',
    type: 'diamond',
    position: [18, 10, -90],
    scale: 1.0,
    color: '#e0d8d0',
    opacity: 0.15,
    rotationSpeed: [0.05, 0.08, 0.05],
    orbitRadius: 7,
    orbitSpeed: 0.018,
    bobAmount: 2.8,
    bobSpeed: 0.04,
    breathInfluence: 0.1,
  },
  {
    id: 'orb-3',
    type: 'orb',
    position: [-15, 5, -100],
    scale: 1.8,
    color: '#d0e0e0',
    opacity: 0.12,
    rotationSpeed: [0.03, 0.05, 0.03],
    orbitRadius: 10,
    orbitSpeed: 0.01,
    bobAmount: 3.5,
    bobSpeed: 0.03,
    breathInfluence: 0.08,
  },

  // Deep background (largest, slowest)
  {
    id: 'crystal-5',
    type: 'crystal',
    position: [30, -8, SCENE_DEPTH.LAYERS.DEEP_BG.z],
    scale: 2.0,
    color: '#e0e0d8',
    opacity: 0.1,
    rotationSpeed: [0.02, 0.04, 0.02],
    orbitRadius: 12,
    orbitSpeed: 0.008,
    bobAmount: 4.0,
    bobSpeed: 0.02,
    breathInfluence: 0.06,
  },
  {
    id: 'ring-3',
    type: 'ring',
    position: [-25, 12, SCENE_DEPTH.LAYERS.DEEP_BG.z - 10],
    scale: 2.5,
    color: '#d8e0e8',
    opacity: 0.08,
    rotationSpeed: [0.015, 0.025, 0.015],
    orbitRadius: 15,
    orbitSpeed: 0.005,
    bobAmount: 5.0,
    bobSpeed: 0.015,
    breathInfluence: 0.05,
  },
];

/**
 * Create geometry based on object type
 */
function createGeometry(type: FloatingObjectConfig['type']): THREE.BufferGeometry {
  switch (type) {
    case 'crystal':
      return new THREE.OctahedronGeometry(1, 0);
    case 'orb':
      return new THREE.IcosahedronGeometry(1, 1);
    case 'ring':
      return new THREE.TorusGeometry(1, 0.15, 8, 24);
    case 'diamond':
      return new THREE.OctahedronGeometry(1, 0);
    default:
      return new THREE.IcosahedronGeometry(1, 1);
  }
}

interface FloatingObjectProps {
  config: FloatingObjectConfig;
}

/**
 * Individual floating object with animation
 */
const FloatingObject = memo(function FloatingObject({ config }: FloatingObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();
  const timeOffset = useRef(Math.random() * 100);

  const geometry = useMemo(() => createGeometry(config.type), [config.type]);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.color),
      transparent: true,
      opacity: config.opacity,
      side: THREE.DoubleSide,
      wireframe: config.type === 'ring',
    });
  }, [config.color, config.opacity, config.type]);

  // Animation
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime + timeOffset.current;

    // Base position
    let x = config.position[0];
    let y = config.position[1];
    const z = config.position[2];

    // Orbital movement
    if (config.orbitRadius > 0) {
      x += Math.cos(time * config.orbitSpeed) * config.orbitRadius;
      y += Math.sin(time * config.orbitSpeed * 0.7) * config.orbitRadius * 0.5;
    }

    // Vertical bobbing
    y += Math.sin(time * config.bobSpeed) * config.bobAmount;

    // Breathing influence
    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      const breathScale = 1 + phase * config.breathInfluence * 0.2;
      meshRef.current.scale.setScalar(config.scale * breathScale);
    }

    // Apply position
    meshRef.current.position.set(x, y, z);

    // Rotation
    meshRef.current.rotation.x += config.rotationSpeed[0] * 0.016;
    meshRef.current.rotation.y += config.rotationSpeed[1] * 0.016;
    meshRef.current.rotation.z += config.rotationSpeed[2] * 0.016;
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={config.position}
      scale={config.scale}
    />
  );
});

export interface FloatingObjectsProps {
  /**
   * Enable floating objects
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
}

/**
 * FloatingObjects - Animated geometric shapes throughout the scene
 *
 * Renders various crystalline and geometric shapes at different depths
 * with smooth orbital motion and breathing synchronization.
 */
export const FloatingObjects = memo(function FloatingObjects({
  enabled = true,
  opacity = 1.0,
}: FloatingObjectsProps) {
  if (!enabled) return null;

  // Apply opacity multiplier
  const adjustedConfigs = FLOATING_OBJECTS.map((config) => ({
    ...config,
    opacity: config.opacity * opacity,
  }));

  return (
    <group name="FloatingObjects">
      {adjustedConfigs.map((config) => (
        <FloatingObject key={config.id} config={config} />
      ))}
    </group>
  );
});

export default FloatingObjects;
