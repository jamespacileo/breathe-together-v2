/**
 * NebulaLayers - Volumetric cloud/nebula layers at multiple depths
 *
 * Creates painterly atmospheric layers that suggest vast cosmic space:
 * - Inner layer (Z: -20): Animated wisps responsive to breathing
 * - Mid layer (Z: -50): Slow drifting clouds
 * - Outer layer (Z: -100): Static painterly backdrop
 *
 * Uses sprite-based cloud rendering for efficient soft volumetric effect.
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

interface NebulaLayersProps {
  /** Enable/disable nebula layers */
  enabled?: boolean;
  /** Overall opacity multiplier */
  opacity?: number;
  /** Primary nebula color */
  color?: string;
  /** Secondary nebula color */
  colorSecondary?: string;
  /** Animation speed multiplier */
  speed?: number;
}

interface CloudSpriteProps {
  position: [number, number, number];
  scale: number;
  opacity: number;
  color: string;
  rotationSpeed: number;
}

function CloudSprite({ position, scale, opacity, color, rotationSpeed }: CloudSpriteProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const initialRotation = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.z = initialRotation + state.clock.elapsedTime * rotationSpeed;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[scale, scale]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}

interface NebulaLayerProps {
  z: number;
  opacity: number;
  scale: number;
  color: string;
  colorSecondary: string;
  speed: number;
  cloudCount: number;
}

function NebulaLayer({
  z,
  opacity,
  scale,
  color,
  colorSecondary,
  speed,
  cloudCount,
}: NebulaLayerProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Generate cloud positions
  const clouds = useMemo(() => {
    const result = [];
    const spreadX = scale * 2;
    const spreadY = scale * 0.8;

    for (let i = 0; i < cloudCount; i++) {
      result.push({
        position: [
          (Math.random() - 0.5) * spreadX,
          (Math.random() - 0.5) * spreadY,
          z + (Math.random() - 0.5) * 10,
        ] as [number, number, number],
        scale: scale * (0.3 + Math.random() * 0.7),
        opacity: opacity * (0.3 + Math.random() * 0.7),
        color: Math.random() > 0.5 ? color : colorSecondary,
        rotationSpeed: (Math.random() - 0.5) * 0.01 * speed,
      });
    }
    return result;
  }, [z, scale, opacity, color, colorSecondary, speed, cloudCount]);

  // Gentle drift animation
  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    groupRef.current.position.x = Math.sin(time * 0.02 * speed) * 2;
    groupRef.current.position.y = Math.cos(time * 0.015 * speed) * 1;
  });

  return (
    <group ref={groupRef}>
      {clouds.map((cloud) => (
        <CloudSprite
          key={`cloud-${cloud.position[0].toFixed(2)}-${cloud.position[1].toFixed(2)}-${cloud.position[2].toFixed(2)}`}
          {...cloud}
        />
      ))}
    </group>
  );
}

export function NebulaLayers({
  enabled = true,
  opacity = 1,
  color = '#9ab8c8', // Darker teal-gray for better visibility
  colorSecondary = '#b8a8c8', // Soft lavender-gray
  speed = 1,
}: NebulaLayersProps) {
  if (!enabled) return null;

  const { INNER, MID, OUTER } = SCENE_DEPTH.NEBULA;

  return (
    <group name="nebula-layers">
      {/* Inner layer - more animated, responsive */}
      <NebulaLayer
        z={INNER.z}
        opacity={INNER.opacity * opacity}
        scale={INNER.scale}
        color={color}
        colorSecondary={colorSecondary}
        speed={speed * 1.5}
        cloudCount={INNER.count}
      />
      {/* Mid layer - slower drift */}
      <NebulaLayer
        z={MID.z}
        opacity={MID.opacity * opacity}
        scale={MID.scale}
        color={color}
        colorSecondary={colorSecondary}
        speed={speed * 0.7}
        cloudCount={MID.count}
      />
      {/* Outer layer - nearly static backdrop */}
      <NebulaLayer
        z={OUTER.z}
        opacity={OUTER.opacity * opacity}
        scale={OUTER.scale}
        color={color}
        colorSecondary={colorSecondary}
        speed={speed * 0.2}
        cloudCount={OUTER.count}
      />
    </group>
  );
}
