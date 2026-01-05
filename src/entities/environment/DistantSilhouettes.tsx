/**
 * DistantSilhouettes - Monument Valley style distant geometric formations
 *
 * Creates layered silhouettes at multiple depths to suggest a vast environment:
 * - Layer 1 (Z: -50): Closest silhouettes, most visible
 * - Layer 2 (Z: -100): Mid-distance formations
 * - Layer 3 (Z: -150): Farthest, barely visible horizon
 *
 * Uses low-poly geometric shapes reminiscent of Monument Valley's aesthetic.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

interface DistantSilhouettesProps {
  /** Enable/disable silhouettes */
  enabled?: boolean;
  /** Overall opacity multiplier */
  opacity?: number;
}

interface SilhouetteLayerProps {
  z: number;
  opacity: number;
  color: string;
  shapes: Array<{
    type: 'cone' | 'box' | 'cylinder';
    position: [number, number, number];
    scale: [number, number, number];
    rotation?: [number, number, number];
  }>;
}

function SilhouetteLayer({ z, opacity, color, shapes }: SilhouetteLayerProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Very subtle parallax sway
  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    groupRef.current.position.x = Math.sin(time * 0.05) * 0.5;
  });

  return (
    <group ref={groupRef} position={[0, 0, z]}>
      {shapes.map((shape) => {
        const [x, y, zOffset] = shape.position;
        const [sx, sy, sz] = shape.scale;
        const rotation = shape.rotation || [0, 0, 0];

        return (
          <mesh
            key={`${shape.type}-${x}-${y}-${zOffset}`}
            position={[x, y, zOffset]}
            rotation={rotation as unknown as THREE.Euler}
            scale={[sx, sy, sz]}
          >
            {shape.type === 'cone' && <coneGeometry args={[1, 2, 6]} />}
            {shape.type === 'box' && <boxGeometry args={[1, 1, 1]} />}
            {shape.type === 'cylinder' && <cylinderGeometry args={[0.8, 1, 2, 8]} />}
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity}
              side={THREE.FrontSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Static shape configurations for each layer - defined outside component
const LAYER_1_SHAPES = [
  {
    type: 'cone' as const,
    position: [-35, -5, 0] as [number, number, number],
    scale: [8, 15, 8] as [number, number, number],
  },
  {
    type: 'cone' as const,
    position: [-20, -8, 5] as [number, number, number],
    scale: [6, 12, 6] as [number, number, number],
  },
  {
    type: 'box' as const,
    position: [25, -6, -3] as [number, number, number],
    scale: [10, 14, 8] as [number, number, number],
  },
  {
    type: 'cone' as const,
    position: [40, -7, 2] as [number, number, number],
    scale: [7, 13, 7] as [number, number, number],
  },
  {
    type: 'cylinder' as const,
    position: [0, -10, 10] as [number, number, number],
    scale: [5, 8, 5] as [number, number, number],
  },
];

const LAYER_2_SHAPES = [
  {
    type: 'cone' as const,
    position: [-60, -8, 0] as [number, number, number],
    scale: [15, 25, 15] as [number, number, number],
  },
  {
    type: 'box' as const,
    position: [-30, -10, 5] as [number, number, number],
    scale: [12, 18, 10] as [number, number, number],
  },
  {
    type: 'cone' as const,
    position: [10, -12, -5] as [number, number, number],
    scale: [10, 20, 10] as [number, number, number],
  },
  {
    type: 'cone' as const,
    position: [45, -9, 3] as [number, number, number],
    scale: [14, 22, 14] as [number, number, number],
  },
  {
    type: 'cylinder' as const,
    position: [70, -11, 0] as [number, number, number],
    scale: [8, 15, 8] as [number, number, number],
  },
];

const LAYER_3_SHAPES = [
  {
    type: 'cone' as const,
    position: [-80, -10, 0] as [number, number, number],
    scale: [25, 40, 25] as [number, number, number],
  },
  {
    type: 'cone' as const,
    position: [-40, -15, 10] as [number, number, number],
    scale: [20, 35, 20] as [number, number, number],
  },
  {
    type: 'box' as const,
    position: [0, -12, -10] as [number, number, number],
    scale: [30, 28, 20] as [number, number, number],
  },
  {
    type: 'cone' as const,
    position: [50, -14, 5] as [number, number, number],
    scale: [22, 38, 22] as [number, number, number],
  },
  {
    type: 'cone' as const,
    position: [90, -12, -5] as [number, number, number],
    scale: [18, 32, 18] as [number, number, number],
  },
];

export function DistantSilhouettes({ enabled = true, opacity = 1 }: DistantSilhouettesProps) {
  if (!enabled) return null;

  const { LAYER_1, LAYER_2, LAYER_3 } = SCENE_DEPTH.SILHOUETTES;

  return (
    <group name="distant-silhouettes">
      <SilhouetteLayer
        z={LAYER_1.z}
        opacity={LAYER_1.opacity * opacity}
        color={LAYER_1.color}
        shapes={LAYER_1_SHAPES}
      />
      <SilhouetteLayer
        z={LAYER_2.z}
        opacity={LAYER_2.opacity * opacity}
        color={LAYER_2.color}
        shapes={LAYER_2_SHAPES}
      />
      <SilhouetteLayer
        z={LAYER_3.z}
        opacity={LAYER_3.opacity * opacity}
        color={LAYER_3.color}
        shapes={LAYER_3_SHAPES}
      />
    </group>
  );
}
