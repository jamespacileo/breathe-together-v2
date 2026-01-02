/**
 * CloudSystem - Memoized volumetric cloud system with continuous movement
 *
 * Features:
 * - Clouds only initialize ONCE on mount (no re-renders from parent state changes)
 * - Continuous right-to-left horizontal drift with seamless looping
 * - Multiple cloud layers (top, middle, bottom) with parallax depth
 * - Pastel Monument Valley color palette
 * - Out-of-view clouds are repositioned to create infinite scrolling effect
 *
 * Subtle details for premium feel:
 * - Varied cloud speeds based on depth (parallax)
 * - Gentle vertical bobbing motion
 * - Opacity varies by distance
 */

import { Cloud, Clouds } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface CloudConfig {
  id: string;
  initialPosition: [number, number, number];
  color: string;
  opacity: number;
  speed: number;
  segments: number;
  bounds: [number, number, number];
  volume: number;
  fade: number;
  layer: 'top' | 'middle' | 'bottom';
  verticalBobSpeed: number;
  verticalBobAmount: number;
}

interface CloudSystemProps {
  /** Base cloud opacity @default 0.4 */
  opacity?: number;
  /** Base movement speed multiplier @default 0.8 */
  speed?: number;
  /** Enable cloud system @default true */
  enabled?: boolean;
}

// Cloud configurations - defined OUTSIDE component to prevent recreation
// These positions, colors, and properties never change after initial mount
const CLOUD_CONFIGS: CloudConfig[] = [
  // === TOP LAYER (z: -25 to -35, y: 12-20) - Fastest parallax ===
  {
    id: 'top-pink-left',
    initialPosition: [-15, 14, -28],
    color: '#f8b4c4', // Soft pink
    opacity: 0.45,
    speed: 1.2,
    segments: 28,
    bounds: [14, 3, 10],
    volume: 6,
    fade: 40,
    layer: 'top',
    verticalBobSpeed: 0.15,
    verticalBobAmount: 0.3,
  },
  {
    id: 'top-lavender-right',
    initialPosition: [20, 16, -32],
    color: '#d4c4e8', // Soft lavender
    opacity: 0.42,
    speed: 1.1,
    segments: 25,
    bounds: [12, 2.5, 8],
    volume: 5,
    fade: 35,
    layer: 'top',
    verticalBobSpeed: 0.12,
    verticalBobAmount: 0.25,
  },
  {
    id: 'top-blue-center',
    initialPosition: [5, 18, -38],
    color: '#a8d4e8', // Sky blue
    opacity: 0.38,
    speed: 1.0,
    segments: 22,
    bounds: [10, 2, 6],
    volume: 4,
    fade: 32,
    layer: 'top',
    verticalBobSpeed: 0.1,
    verticalBobAmount: 0.2,
  },

  // === MIDDLE LAYER (z: -35 to -45, y: 4-10) - Medium parallax ===
  {
    id: 'mid-peach-left',
    initialPosition: [-22, 6, -40],
    color: '#f8d4b8', // Warm peach
    opacity: 0.4,
    speed: 0.85,
    segments: 26,
    bounds: [16, 2.5, 10],
    volume: 5,
    fade: 42,
    layer: 'middle',
    verticalBobSpeed: 0.08,
    verticalBobAmount: 0.35,
  },
  {
    id: 'mid-mint-right',
    initialPosition: [18, 7, -42],
    color: '#b8e8d4', // Soft mint
    opacity: 0.38,
    speed: 0.8,
    segments: 24,
    bounds: [14, 2, 9],
    volume: 4.5,
    fade: 38,
    layer: 'middle',
    verticalBobSpeed: 0.09,
    verticalBobAmount: 0.3,
  },
  {
    id: 'mid-rose-center',
    initialPosition: [-5, 8, -38],
    color: '#e8c4d4', // Dusty rose
    opacity: 0.35,
    speed: 0.9,
    segments: 22,
    bounds: [12, 2, 7],
    volume: 4,
    fade: 36,
    layer: 'middle',
    verticalBobSpeed: 0.11,
    verticalBobAmount: 0.28,
  },
  {
    id: 'mid-cream-far-left',
    initialPosition: [-35, 5, -44],
    color: '#f0e8dc', // Warm cream
    opacity: 0.32,
    speed: 0.75,
    segments: 20,
    bounds: [18, 1.8, 12],
    volume: 3.5,
    fade: 45,
    layer: 'middle',
    verticalBobSpeed: 0.07,
    verticalBobAmount: 0.4,
  },

  // === BOTTOM LAYER (z: -45 to -55, y: -2 to 4) - Slowest parallax (ground fog feel) ===
  {
    id: 'bottom-apricot-left',
    initialPosition: [-25, 1, -48],
    color: '#f8e0c8', // Soft apricot
    opacity: 0.35,
    speed: 0.6,
    segments: 30,
    bounds: [20, 2, 14],
    volume: 4,
    fade: 50,
    layer: 'bottom',
    verticalBobSpeed: 0.05,
    verticalBobAmount: 0.5,
  },
  {
    id: 'bottom-blush-right',
    initialPosition: [22, 0, -50],
    color: '#f0d4d4', // Blush pink
    opacity: 0.32,
    speed: 0.55,
    segments: 28,
    bounds: [18, 1.5, 12],
    volume: 3.5,
    fade: 48,
    layer: 'bottom',
    verticalBobSpeed: 0.06,
    verticalBobAmount: 0.45,
  },
  {
    id: 'bottom-mist-center',
    initialPosition: [0, -1, -52],
    color: '#e8e4e0', // Warm mist
    opacity: 0.28,
    speed: 0.5,
    segments: 32,
    bounds: [24, 1.5, 16],
    volume: 3,
    fade: 55,
    layer: 'bottom',
    verticalBobSpeed: 0.04,
    verticalBobAmount: 0.6,
  },
  {
    id: 'bottom-lilac-far-right',
    initialPosition: [38, 2, -46],
    color: '#e0d8e8', // Soft lilac
    opacity: 0.3,
    speed: 0.65,
    segments: 24,
    bounds: [15, 2, 10],
    volume: 3.5,
    fade: 44,
    layer: 'bottom',
    verticalBobSpeed: 0.055,
    verticalBobAmount: 0.42,
  },

  // === EXTRA DETAIL CLOUDS (scattered for depth) ===
  {
    id: 'detail-coral-high',
    initialPosition: [-30, 12, -35],
    color: '#f8c8b8', // Soft coral
    opacity: 0.25,
    speed: 1.0,
    segments: 18,
    bounds: [8, 1.5, 5],
    volume: 3,
    fade: 30,
    layer: 'top',
    verticalBobSpeed: 0.13,
    verticalBobAmount: 0.22,
  },
  {
    id: 'detail-sage-mid',
    initialPosition: [30, 4, -43],
    color: '#c8dcc8', // Soft sage
    opacity: 0.28,
    speed: 0.7,
    segments: 20,
    bounds: [10, 1.8, 7],
    volume: 3,
    fade: 40,
    layer: 'middle',
    verticalBobSpeed: 0.085,
    verticalBobAmount: 0.32,
  },
];

// Horizontal bounds for cloud looping
const CLOUD_X_MIN = -50;
const CLOUD_X_MAX = 50;
const CLOUD_LOOP_BUFFER = 15; // Extra space before repositioning

/**
 * Individual cloud with its own animation state
 * Using refs to avoid re-renders during animation
 */
const AnimatedCloud = memo(function AnimatedCloud({
  config,
  baseOpacity,
  baseSpeed,
}: {
  config: CloudConfig;
  baseOpacity: number;
  baseSpeed: number;
}) {
  const cloudRef = useRef<THREE.Group>(null);
  const initialY = useRef(config.initialPosition[1]);
  const currentX = useRef(config.initialPosition[0]);
  const timeOffset = useRef(Math.random() * 100); // Random phase for bobbing

  // Animate position each frame
  useFrame((state) => {
    if (!cloudRef.current) return;

    const time = state.clock.elapsedTime + timeOffset.current;

    // Horizontal movement (right to left)
    const horizontalSpeed = config.speed * baseSpeed * 0.8;
    currentX.current -= horizontalSpeed * 0.016; // ~60fps delta approximation

    // Loop cloud when it goes off-screen left
    if (currentX.current < CLOUD_X_MIN - CLOUD_LOOP_BUFFER) {
      currentX.current = CLOUD_X_MAX + CLOUD_LOOP_BUFFER;
    }

    // Gentle vertical bobbing
    const verticalOffset = Math.sin(time * config.verticalBobSpeed) * config.verticalBobAmount;

    // Apply position
    cloudRef.current.position.x = currentX.current;
    cloudRef.current.position.y = initialY.current + verticalOffset;
  });

  const finalOpacity = config.opacity * baseOpacity;

  return (
    <group ref={cloudRef} position={config.initialPosition}>
      <Cloud
        opacity={finalOpacity}
        speed={0.1} // Internal cloud animation (slow, just for texture variation)
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
 * CloudSystem - Memoized cloud container
 *
 * The entire cloud system is wrapped in memo() with no dependencies,
 * ensuring clouds are created ONCE and never re-render from parent changes.
 */
export const CloudSystem = memo(function CloudSystem({
  opacity = 0.4,
  speed = 0.8,
  enabled = true,
}: CloudSystemProps) {
  // Memoize the cloud configs array reference (it's already static, but this is defensive)
  const configs = useMemo(() => CLOUD_CONFIGS, []);

  if (!enabled) return null;

  return (
    <Clouds material={THREE.MeshBasicMaterial}>
      {configs.map((config) => (
        <AnimatedCloud key={config.id} config={config} baseOpacity={opacity} baseSpeed={speed} />
      ))}
    </Clouds>
  );
});

export default CloudSystem;
