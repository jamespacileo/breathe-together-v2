/**
 * AtmosphericClouds - Monument Valley inspired stylized clouds
 *
 * Uses soft, billboarded cloud sprites for a dreamy atmospheric effect.
 * Positioned around scene periphery to enhance atmosphere without
 * blocking central meditation focus.
 */

import { Billboard, Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface AtmosphericCloudsProps {
  /** Enable/disable clouds @default true */
  enabled?: boolean;
  /** Cloud opacity @default 0.3 */
  opacity?: number;
  /** Animation speed multiplier @default 0.5 */
  speed?: number;
}

interface CloudConfig {
  position: [number, number, number];
  scale: number;
  color: string;
  opacity: number;
}

// Soft gradient texture for cloud sprites
function createCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Create radial gradient for soft cloud shape
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Single cloud sprite component
 */
function CloudSprite({
  position,
  scale,
  color,
  opacity,
  texture,
}: CloudConfig & { texture: THREE.Texture }) {
  return (
    <Billboard position={position}>
      <mesh scale={scale}>
        <planeGeometry args={[4, 2.5]} />
        <meshBasicMaterial
          map={texture}
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
    </Billboard>
  );
}

/**
 * Creates Monument Valley style atmospheric clouds
 * - Warm-tinted clouds near horizon
 * - Cooler clouds higher up
 * - Gentle drift animation
 */
export function AtmosphericClouds({
  enabled = true,
  opacity = 0.3,
  speed = 0.5,
}: AtmosphericCloudsProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Create cloud texture once
  const cloudTexture = useMemo(() => createCloudTexture(), []);

  // Cloud configurations - arranged in layers with pastel colors
  // Soft pastels that pop against the creamy neutral background
  const clouds = useMemo<CloudConfig[]>(
    () => [
      // Lower horizon clouds - soft peach and blush pastels
      { position: [-15, -3, -25], scale: 3.5, color: '#f8d4c8', opacity: opacity * 1.0 }, // Soft peach
      { position: [18, -2, -22], scale: 3.0, color: '#f5c6d0', opacity: opacity * 0.9 }, // Blush pink
      { position: [0, -4, -30], scale: 4.0, color: '#e8d8f0', opacity: opacity * 0.85 }, // Soft lavender
      { position: [-25, -1, -28], scale: 2.8, color: '#d4e8f0', opacity: opacity * 0.9 }, // Pale sky blue
      { position: [25, -3, -26], scale: 3.2, color: '#f0e0d0', opacity: opacity * 0.85 }, // Warm cream

      // Mid-level clouds - mix of pastel pink, mint, lavender
      { position: [-12, 5, -28], scale: 2.5, color: '#e0f0e8', opacity: opacity * 0.8 }, // Soft mint
      { position: [14, 6, -26], scale: 2.2, color: '#f0d8e8', opacity: opacity * 0.75 }, // Rose quartz
      { position: [-8, 8, -30], scale: 2.8, color: '#d8e0f8', opacity: opacity * 0.7 }, // Periwinkle
      { position: [20, 7, -24], scale: 2.0, color: '#f8e8d0', opacity: opacity * 0.75 }, // Pale buttercup

      // Upper clouds - lighter pastels (sky blue, lilac)
      { position: [8, 12, -32], scale: 2.0, color: '#d0e8f8', opacity: opacity * 0.65 }, // Baby blue
      { position: [-10, 14, -34], scale: 1.8, color: '#e8d0f0', opacity: opacity * 0.6 }, // Soft lilac
      { position: [15, 15, -30], scale: 1.5, color: '#d8f0e0', opacity: opacity * 0.55 }, // Seafoam
      { position: [-20, 12, -28], scale: 2.2, color: '#f0e8f0', opacity: opacity * 0.6 }, // Pale mauve

      // Accent wisps - delicate pastel touches
      { position: [22, 10, -20], scale: 1.2, color: '#f8d8d8', opacity: opacity * 0.5 }, // Shell pink
      { position: [-22, 4, -18], scale: 1.5, color: '#d8f8f0', opacity: opacity * 0.55 }, // Aqua mist
      { position: [5, 18, -35], scale: 1.0, color: '#e0d8f8', opacity: opacity * 0.45 }, // Wisteria
    ],
    [opacity],
  );

  // Gentle rotation for cloud drift effect
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.008 * speed;
    }
  });

  // Cleanup texture on unmount
  useEffect(() => {
    return () => {
      cloudTexture.dispose();
    };
  }, [cloudTexture]);

  if (!enabled) return null;

  return (
    <group ref={groupRef}>
      {/* Cloud sprites */}
      {clouds.map((cloud, i) => (
        <CloudSprite
          key={`cloud-${i}-${cloud.position.join('-')}`}
          {...cloud}
          texture={cloudTexture}
        />
      ))}

      {/* Subtle atmospheric sparkles for depth - soft pastel shimmer */}
      <Sparkles
        count={40}
        scale={[50, 30, 50]}
        size={1.5}
        speed={0.2 * speed}
        opacity={opacity * 0.4}
        color="#e8d8f0"
      />
    </group>
  );
}

export default AtmosphericClouds;
