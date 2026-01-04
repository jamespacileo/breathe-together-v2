/**
 * ParallaxBackground - Distant cloud layer for depth perception
 *
 * This component renders OUTSIDE MomentumControls to create parallax:
 * - When user rotates the scene, these clouds stay mostly stationary
 * - Creates visual depth separation between foreground (globe/shards) and background
 * - Uses larger, more ethereal clouds at far distance
 *
 * Design: Three depth zones for parallax effect
 * - Far layer (z: -40 to -60): Very slow movement, largest clouds
 * - Mid layer (z: -25 to -35): Medium movement
 * - Near layer (z: -15 to -20): Faster parallax, smaller accents
 */

import { Cloud, Clouds } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface ParallaxCloudConfig {
  id: string;
  position: [number, number, number];
  color: string;
  opacity: number;
  segments: number;
  bounds: [number, number, number];
  volume: number;
  fade: number;
  /** Parallax factor: 0 = no movement, 1 = full camera tracking */
  parallaxFactor: number;
  /** Slow drift animation */
  driftSpeed: number;
  driftAmplitude: number;
}

interface ParallaxBackgroundProps {
  /** Base opacity for all clouds @default 0.35 */
  opacity?: number;
  /** Enable parallax effect @default true */
  enabled?: boolean;
  /** Parallax intensity multiplier @default 1.0 */
  parallaxIntensity?: number;
}

// Distant cloud configurations - positioned on a large sphere behind the scene
// These create the "sky dome" effect with depth
const PARALLAX_CLOUDS: ParallaxCloudConfig[] = [
  // === FAR LAYER (z: -40 to -60) - Largest, most ethereal ===
  {
    id: 'far-mist-1',
    position: [-25, 15, -50],
    color: '#f0e8e0', // Warm mist
    opacity: 0.25,
    segments: 35,
    bounds: [20, 8, 12],
    volume: 8,
    fade: 30,
    parallaxFactor: 0.05, // Very slow parallax
    driftSpeed: 0.02,
    driftAmplitude: 3,
  },
  {
    id: 'far-blush-2',
    position: [30, -10, -55],
    color: '#f8d4d4', // Soft blush
    opacity: 0.22,
    segments: 32,
    bounds: [18, 6, 10],
    volume: 7,
    fade: 28,
    parallaxFactor: 0.04,
    driftSpeed: 0.015,
    driftAmplitude: 4,
  },
  {
    id: 'far-lavender-3',
    position: [0, 20, -60],
    color: '#e8ddf0', // Soft lavender
    opacity: 0.2,
    segments: 30,
    bounds: [22, 7, 14],
    volume: 9,
    fade: 32,
    parallaxFactor: 0.03,
    driftSpeed: 0.018,
    driftAmplitude: 2,
  },
  {
    id: 'far-peach-4',
    position: [-20, -15, -45],
    color: '#fae8d8', // Warm peach
    opacity: 0.24,
    segments: 28,
    bounds: [16, 5, 10],
    volume: 6,
    fade: 25,
    parallaxFactor: 0.06,
    driftSpeed: 0.022,
    driftAmplitude: 3.5,
  },

  // === MID LAYER (z: -25 to -35) - Medium presence ===
  {
    id: 'mid-rose-1',
    position: [20, 8, -30],
    color: '#f0c8d0', // Dusty rose
    opacity: 0.28,
    segments: 26,
    bounds: [12, 4, 8],
    volume: 5,
    fade: 20,
    parallaxFactor: 0.1,
    driftSpeed: 0.025,
    driftAmplitude: 2,
  },
  {
    id: 'mid-mint-2',
    position: [-18, 5, -28],
    color: '#d8f0e8', // Soft mint
    opacity: 0.26,
    segments: 24,
    bounds: [10, 3.5, 7],
    volume: 4.5,
    fade: 18,
    parallaxFactor: 0.12,
    driftSpeed: 0.028,
    driftAmplitude: 2.5,
  },
  {
    id: 'mid-cream-3',
    position: [0, -12, -32],
    color: '#faf5f0', // Warm cream
    opacity: 0.24,
    segments: 22,
    bounds: [14, 4, 9],
    volume: 5,
    fade: 22,
    parallaxFactor: 0.08,
    driftSpeed: 0.02,
    driftAmplitude: 3,
  },
  {
    id: 'mid-sky-4',
    position: [-12, 18, -35],
    color: '#d8e8f8', // Sky blue tint
    opacity: 0.22,
    segments: 25,
    bounds: [11, 4, 8],
    volume: 4,
    fade: 19,
    parallaxFactor: 0.09,
    driftSpeed: 0.023,
    driftAmplitude: 2.2,
  },

  // === NEAR ACCENT LAYER (z: -15 to -20) - Smaller, more visible parallax ===
  {
    id: 'near-pink-1',
    position: [15, -5, -18],
    color: '#f8c8d8', // Soft pink
    opacity: 0.3,
    segments: 20,
    bounds: [6, 2.5, 4],
    volume: 3,
    fade: 14,
    parallaxFactor: 0.18,
    driftSpeed: 0.03,
    driftAmplitude: 1.5,
  },
  {
    id: 'near-gold-2',
    position: [-14, 10, -16],
    color: '#f8e8c8', // Soft gold
    opacity: 0.28,
    segments: 18,
    bounds: [5, 2, 3.5],
    volume: 2.5,
    fade: 12,
    parallaxFactor: 0.2,
    driftSpeed: 0.035,
    driftAmplitude: 1.8,
  },
  {
    id: 'near-violet-3',
    position: [8, 15, -20],
    color: '#e8d8f0', // Soft violet
    opacity: 0.25,
    segments: 19,
    bounds: [7, 2.5, 4],
    volume: 3,
    fade: 15,
    parallaxFactor: 0.15,
    driftSpeed: 0.028,
    driftAmplitude: 2,
  },
];

// Reusable vector for parallax calculations
const _cameraOffset = new THREE.Vector3();

/**
 * Individual parallax cloud with camera-relative positioning
 */
const ParallaxCloud = memo(function ParallaxCloud({
  config,
  baseOpacity,
  parallaxIntensity,
}: {
  config: ParallaxCloudConfig;
  baseOpacity: number;
  parallaxIntensity: number;
}) {
  const cloudRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const timeOffset = useRef(Math.random() * 100);

  // Store initial position for parallax calculation
  const basePosition = useMemo(() => new THREE.Vector3(...config.position), [config.position]);

  useFrame((state) => {
    if (!cloudRef.current) return;

    const time = state.clock.elapsedTime + timeOffset.current;

    // Parallax: offset position based on camera rotation
    // Camera looking right → clouds shift left (opposite direction)
    _cameraOffset.set(
      -camera.rotation.y * config.parallaxFactor * parallaxIntensity * 20,
      camera.rotation.x * config.parallaxFactor * parallaxIntensity * 10,
      0,
    );

    // Gentle drift animation
    const driftX = Math.sin(time * config.driftSpeed) * config.driftAmplitude;
    const driftY = Math.cos(time * config.driftSpeed * 0.7) * config.driftAmplitude * 0.5;

    cloudRef.current.position.set(
      basePosition.x + _cameraOffset.x + driftX,
      basePosition.y + _cameraOffset.y + driftY,
      basePosition.z,
    );
  });

  const finalOpacity = config.opacity * baseOpacity;

  return (
    <group ref={cloudRef} position={config.position}>
      <Cloud
        opacity={finalOpacity}
        speed={0.05} // Very slow internal animation
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
 * ParallaxBackground - Creates depth through parallax cloud layers
 *
 * IMPORTANT: This component must be rendered OUTSIDE MomentumControls
 * to create the parallax effect. The clouds respond to camera rotation
 * but don't rotate with the globe/shards.
 */
export const ParallaxBackground = memo(function ParallaxBackground({
  opacity = 0.35,
  enabled = true,
  parallaxIntensity = 1.0,
}: ParallaxBackgroundProps) {
  const configs = useMemo(() => PARALLAX_CLOUDS, []);

  if (!enabled) return null;

  return (
    <Clouds material={THREE.MeshBasicMaterial}>
      {configs.map((config) => (
        <ParallaxCloud
          key={config.id}
          config={config}
          baseOpacity={opacity}
          parallaxIntensity={parallaxIntensity}
        />
      ))}
    </Clouds>
  );
});

export default ParallaxBackground;
