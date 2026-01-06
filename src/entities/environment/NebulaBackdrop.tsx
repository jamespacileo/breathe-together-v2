/**
 * NebulaBackdrop - Subtle distant galaxy haze behind constellations
 *
 * Uses drei's Clouds + Stars for a soft Milky Way feel without overpowering the scene.
 * Placed beyond the constellation radius so it reads as distant atmospheric color.
 */

import { Cloud, Clouds, Stars } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RENDER_LAYERS } from '../../constants';
import { useViewport } from '../../hooks/useViewport';

interface NebulaBackdropProps {
  /** Enable nebula background @default true */
  enabled?: boolean;
}

interface NebulaClusterConfig {
  id: string;
  direction: [number, number, number];
  radius: number;
  color: string;
  opacity: number;
  bounds: [number, number, number];
  volume: number;
  segments: number;
  speed: number;
  fade: number;
  growth: number;
}

const NEBULA_CLUSTERS: NebulaClusterConfig[] = [
  {
    id: 'nebula-lilac',
    direction: [0.38, 0.22, -0.9],
    radius: 34,
    color: '#b7a0ff',
    opacity: 0.08,
    bounds: [10, 3.5, 7],
    volume: 6.5,
    segments: 16,
    speed: 0.02,
    fade: 38,
    growth: 3.2,
  },
  {
    id: 'nebula-ice',
    direction: [-0.42, 0.12, -0.9],
    radius: 32,
    color: '#8ac7ff',
    opacity: 0.07,
    bounds: [9, 3, 6],
    volume: 5.8,
    segments: 14,
    speed: 0.018,
    fade: 36,
    growth: 3.0,
  },
  {
    id: 'nebula-rose',
    direction: [0.12, -0.32, -0.94],
    radius: 36,
    color: '#f2a9ff',
    opacity: 0.06,
    bounds: [8.5, 2.8, 5.5],
    volume: 5.2,
    segments: 12,
    speed: 0.016,
    fade: 34,
    growth: 2.8,
  },
];

export function NebulaBackdrop({ enabled = true }: NebulaBackdropProps) {
  const groupRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Points>(null);
  const { isMobile, isTablet } = useViewport();

  const nebulaPositions = useMemo(() => {
    return NEBULA_CLUSTERS.map((cluster) => {
      const direction = new THREE.Vector3(...cluster.direction).normalize();
      direction.multiplyScalar(cluster.radius);
      return [direction.x, direction.y, direction.z] as [number, number, number];
    });
  }, []);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.traverse((object) => {
      object.layers.set(RENDER_LAYERS.EFFECTS);
    });
  }, []);

  useEffect(() => {
    if (starsRef.current) {
      starsRef.current.layers.set(RENDER_LAYERS.EFFECTS);
    }
  }, []);

  if (!enabled) return null;

  const starCount = isMobile ? 260 : isTablet ? 420 : 720;
  const starFactor = isMobile ? 0.8 : isTablet ? 1.0 : 1.2;
  const starRadius = isMobile ? 30 : isTablet ? 34 : 36;
  const starDepth = isMobile ? 5 : isTablet ? 6 : 8;

  return (
    <group ref={groupRef} name="Nebula Backdrop">
      <group rotation={[0.16, -0.35, 0.05]}>
        <Clouds limit={64} frustumCulled={false}>
          {NEBULA_CLUSTERS.map((cluster, index) => (
            <group key={cluster.id} position={nebulaPositions[index]}>
              <Cloud
                opacity={cluster.opacity}
                color={cluster.color}
                speed={cluster.speed}
                segments={cluster.segments}
                bounds={cluster.bounds}
                volume={cluster.volume}
                fade={cluster.fade}
                growth={cluster.growth}
                concentrate="inside"
              />
            </group>
          ))}
        </Clouds>
      </group>

      {/* Compressed star band for a subtle galactic haze behind constellations */}
      <group rotation={[0.22, -0.4, 0.12]} scale={[1, 0.35, 1]}>
        <Stars
          ref={starsRef}
          radius={starRadius}
          depth={starDepth}
          count={starCount}
          factor={starFactor}
          saturation={0.2}
          fade
          speed={0.03}
        />
      </group>
    </group>
  );
}

export default NebulaBackdrop;
