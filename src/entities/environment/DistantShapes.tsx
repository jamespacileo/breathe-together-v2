/**
 * DistantShapes - Simple 3D objects placed at various distances for depth perception
 *
 * Creates Monument Valley-style distant landmarks that provide:
 * - Size diminution (objects appear smaller with distance)
 * - Atmospheric perspective (objects fade with distance)
 * - Spatial reference points beyond the main scene
 *
 * Shapes are simple geometric primitives (pillars, pyramids, spheres)
 * rendered with subtle colors that fade into the background.
 */

import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface DistantShapesProps {
  /** Enable distant shapes @default true */
  enabled?: boolean;
  /** Overall opacity of distant shapes @default 0.3 */
  opacity?: number;
  /** Base color for shapes @default '#d4ccc4' */
  color?: string;
  /** How much shapes fade with distance (0-1) @default 0.6 */
  atmosphericFade?: number;
  /** Scale multiplier for all shapes @default 1 */
  scale?: number;
  /** Enable subtle floating animation @default true */
  animate?: boolean;
}

interface ShapeConfig {
  id: string;
  type: 'pillar' | 'pyramid' | 'sphere' | 'torus' | 'cone';
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  /** Distance-based opacity modifier (0-1, multiplied by base opacity) */
  distanceFade: number;
}

// Configuration for distant shapes - positioned around the scene
// Inspired by Monument Valley's layered landscape
const SHAPE_CONFIGS: ShapeConfig[] = [
  // === FAR BACKGROUND (Z: -60 to -80) - Very faded, large shapes ===
  {
    id: 'far-pillar-left',
    type: 'pillar',
    position: [-45, -8, -70],
    scale: [3, 25, 3],
    color: '#e0d8d0',
    distanceFade: 0.15,
  },
  {
    id: 'far-pillar-right',
    type: 'pillar',
    position: [50, -10, -75],
    scale: [4, 30, 4],
    color: '#ddd5cd',
    distanceFade: 0.12,
  },
  {
    id: 'far-pyramid-center',
    type: 'pyramid',
    position: [0, -15, -80],
    scale: [20, 15, 20],
    color: '#e5ddd5',
    distanceFade: 0.1,
  },

  // === MID BACKGROUND (Z: -35 to -50) - Moderately faded ===
  {
    id: 'mid-pillar-left',
    type: 'pillar',
    position: [-30, -5, -40],
    scale: [2, 15, 2],
    color: '#d8d0c8',
    distanceFade: 0.25,
  },
  {
    id: 'mid-sphere-right',
    type: 'sphere',
    position: [35, 5, -45],
    scale: [4, 4, 4],
    color: '#e0d8d0',
    distanceFade: 0.2,
  },
  {
    id: 'mid-cone-left',
    type: 'cone',
    position: [-40, -3, -50],
    scale: [3, 8, 3],
    color: '#ddd5cd',
    distanceFade: 0.18,
  },
  {
    id: 'mid-torus-right',
    type: 'torus',
    position: [28, 8, -38],
    scale: [2, 2, 2],
    rotation: [Math.PI / 4, 0, Math.PI / 6],
    color: '#d4ccc4',
    distanceFade: 0.28,
  },

  // === NEAR BACKGROUND (Z: -20 to -30) - More visible ===
  {
    id: 'near-pillar-far-left',
    type: 'pillar',
    position: [-25, -2, -25],
    scale: [1.5, 10, 1.5],
    color: '#cec6be',
    distanceFade: 0.4,
  },
  {
    id: 'near-pyramid-right',
    type: 'pyramid',
    position: [22, -4, -28],
    scale: [5, 6, 5],
    color: '#d0c8c0',
    distanceFade: 0.35,
  },
  {
    id: 'near-sphere-left',
    type: 'sphere',
    position: [-18, 3, -22],
    scale: [1.5, 1.5, 1.5],
    color: '#c8c0b8',
    distanceFade: 0.45,
  },

  // === SIDE SHAPES (far left/right, various Z) - Frame the scene ===
  {
    id: 'side-pillar-left',
    type: 'pillar',
    position: [-55, -6, -30],
    scale: [2.5, 18, 2.5],
    color: '#dcd4cc',
    distanceFade: 0.22,
  },
  {
    id: 'side-pillar-right',
    type: 'pillar',
    position: [55, -8, -35],
    scale: [3, 22, 3],
    color: '#d8d0c8',
    distanceFade: 0.2,
  },
];

/**
 * Single distant shape with atmospheric fading
 */
const DistantShape = memo(function DistantShape({
  config,
  baseOpacity,
  baseColor,
  atmosphericFade,
  globalScale,
  animate,
}: {
  config: ShapeConfig;
  baseOpacity: number;
  baseColor: string;
  atmosphericFade: number;
  globalScale: number;
  animate: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeOffset = useMemo(() => Math.random() * 100, []);

  // Calculate final opacity with atmospheric fade
  const finalOpacity = baseOpacity * config.distanceFade * (1 - atmosphericFade * 0.5);

  // Blend shape color with base color
  const shapeColor = useMemo(() => {
    const base = new THREE.Color(baseColor);
    const shape = new THREE.Color(config.color);
    return base.lerp(shape, 0.5);
  }, [baseColor, config.color]);

  // Create geometry based on type
  const geometry = useMemo(() => {
    switch (config.type) {
      case 'pillar':
        return new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
      case 'pyramid':
        return new THREE.ConeGeometry(0.5, 1, 4);
      case 'sphere':
        return new THREE.SphereGeometry(0.5, 16, 12);
      case 'torus':
        return new THREE.TorusGeometry(0.5, 0.15, 8, 16);
      case 'cone':
        return new THREE.ConeGeometry(0.5, 1, 16);
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }, [config.type]);

  // Create material with atmospheric color
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: shapeColor,
      transparent: true,
      opacity: finalOpacity,
      fog: true,
    });
  }, [shapeColor, finalOpacity]);

  // Subtle floating animation
  useFrame((state) => {
    if (!meshRef.current || !animate) return;

    const time = state.clock.elapsedTime + timeOffset;
    // Very subtle vertical bobbing
    meshRef.current.position.y =
      config.position[1] * globalScale + Math.sin(time * 0.3) * 0.2 * globalScale;
    // Very subtle rotation
    meshRef.current.rotation.y += 0.001;
  });

  const scale: [number, number, number] = [
    config.scale[0] * globalScale,
    config.scale[1] * globalScale,
    config.scale[2] * globalScale,
  ];

  const position: [number, number, number] = [
    config.position[0] * globalScale,
    config.position[1] * globalScale,
    config.position[2] * globalScale,
  ];

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={position}
      scale={scale}
      rotation={config.rotation || [0, 0, 0]}
      // Mark for testing
      name={`distant-shape-${config.id}`}
      userData={{ isDistantShape: true, shapeId: config.id }}
    />
  );
});

/**
 * DistantShapes - Collection of simple 3D shapes at various distances
 */
export const DistantShapes = memo(function DistantShapes({
  enabled = true,
  opacity = 0.3,
  color = '#d4ccc4',
  atmosphericFade = 0.6,
  scale = 1,
  animate = true,
}: DistantShapesProps) {
  if (!enabled) return null;

  return (
    <group name="distant-shapes-group">
      {SHAPE_CONFIGS.map((config) => (
        <DistantShape
          key={config.id}
          config={config}
          baseOpacity={opacity}
          baseColor={color}
          atmosphericFade={atmosphericFade}
          globalScale={scale}
          animate={animate}
        />
      ))}
    </group>
  );
});

export default DistantShapes;

// Export configs for testing
export { SHAPE_CONFIGS };
