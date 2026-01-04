/**
 * CloudSystem - Spherically distributed volumetric clouds around the globe
 *
 * Features:
 * - Clouds distributed on a sphere surrounding the globe and shards
 * - Rotates WITH the globe/shards when user drags (via MomentumControls parent)
 * - Subtle orbital drift and vertical bobbing for organic feel
 * - Pastel Monument Valley color palette
 * - Multiple layers at different radii for depth
 *
 * Integration:
 * - Must be placed inside MomentumControls group to rotate with scene
 * - Uses Fibonacci sphere distribution for even cloud coverage
 * - Local-space animations that don't fight parent rotation
 */

import { Cloud, Clouds } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface CloudConfig {
  id: string;
  /** Index for Fibonacci sphere distribution */
  sphereIndex: number;
  /** Total clouds in this layer for distribution */
  layerTotal: number;
  /** Radius from center (globe is 1.5, shards orbit at ~4.5) */
  radius: number;
  color: string;
  opacity: number;
  /** Orbital drift speed (radians/second) */
  orbitSpeed: number;
  segments: number;
  bounds: [number, number, number];
  volume: number;
  fade: number;
  layer: 'inner' | 'middle' | 'outer';
  /** Vertical bobbing speed */
  bobSpeed: number;
  /** Vertical bobbing amplitude */
  bobAmount: number;
  /** Radial breathing amplitude */
  breathAmount: number;
}

interface CloudSystemProps {
  /** Base cloud opacity @default 0.4 */
  opacity?: number;
  /** Base movement speed multiplier @default 0.8 */
  speed?: number;
  /** Enable cloud system @default true */
  enabled?: boolean;
}

/**
 * Calculate Fibonacci sphere point for even distribution
 * Same algorithm used by ParticleSwarm for consistency
 */
function getFibonacciSpherePoint(index: number, total: number): THREE.Vector3 {
  if (total <= 1) {
    return new THREE.Vector3(0, 1, 0);
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (total - 1)) * 2;
  const radiusAtY = Math.sqrt(1 - y * y);
  const theta = goldenAngle * index;

  return new THREE.Vector3(Math.cos(theta) * radiusAtY, y, Math.sin(theta) * radiusAtY);
}

// Cloud configurations - spherically distributed around the globe
// HARMONIZED WARM NEUTRAL PALETTE
// All clouds use cream/ivory/warm white tones for atmospheric cohesion
// Lets the particle colors be the visual focus
// LAYERS:
// - Inner layer (radius 7-8): 6 clouds, closest to shards
// - Middle layer (radius 9-10): 5 clouds
// - Outer layer (radius 11-13): 4 clouds, furthest, largest
const CLOUD_CONFIGS: CloudConfig[] = [
  // === INNER LAYER (radius 7-8) - 6 clouds, subtle and close ===
  {
    id: 'inner-cream-1',
    sphereIndex: 0,
    layerTotal: 6,
    radius: 7,
    color: '#f5efe8', // Warm cream
    opacity: 0.32,
    orbitSpeed: 0.012,
    segments: 22,
    bounds: [4, 1.5, 3],
    volume: 3,
    fade: 12,
    layer: 'inner',
    bobSpeed: 0.15,
    bobAmount: 0.15,
    breathAmount: 0.3,
  },
  {
    id: 'inner-ivory-2',
    sphereIndex: 1,
    layerTotal: 6,
    radius: 7.5,
    color: '#f8f4f0', // Soft ivory
    opacity: 0.3,
    orbitSpeed: 0.01,
    segments: 20,
    bounds: [3.5, 1.2, 2.5],
    volume: 2.5,
    fade: 10,
    layer: 'inner',
    bobSpeed: 0.12,
    bobAmount: 0.12,
    breathAmount: 0.25,
  },
  {
    id: 'inner-mist-3',
    sphereIndex: 2,
    layerTotal: 6,
    radius: 8,
    color: '#f0ebe5', // Warm mist
    opacity: 0.28,
    orbitSpeed: 0.014,
    segments: 18,
    bounds: [4, 1.3, 3],
    volume: 2.5,
    fade: 11,
    layer: 'inner',
    bobSpeed: 0.1,
    bobAmount: 0.1,
    breathAmount: 0.2,
  },
  {
    id: 'inner-linen-4',
    sphereIndex: 3,
    layerTotal: 6,
    radius: 7.2,
    color: '#f6f0e8', // Soft linen
    opacity: 0.26,
    orbitSpeed: 0.011,
    segments: 16,
    bounds: [3, 1, 2],
    volume: 2,
    fade: 10,
    layer: 'inner',
    bobSpeed: 0.13,
    bobAmount: 0.14,
    breathAmount: 0.22,
  },
  {
    id: 'inner-pearl-5',
    sphereIndex: 4,
    layerTotal: 6,
    radius: 7.8,
    color: '#f8f2ec', // Pearl white
    opacity: 0.24,
    orbitSpeed: 0.009,
    segments: 15,
    bounds: [3.5, 1.1, 2.5],
    volume: 2,
    fade: 9,
    layer: 'inner',
    bobSpeed: 0.11,
    bobAmount: 0.11,
    breathAmount: 0.18,
  },
  {
    id: 'inner-bone-6',
    sphereIndex: 5,
    layerTotal: 6,
    radius: 7.3,
    color: '#f2ebe2', // Bone white
    opacity: 0.28,
    orbitSpeed: 0.013,
    segments: 17,
    bounds: [3.5, 1.2, 2.5],
    volume: 2.5,
    fade: 10,
    layer: 'inner',
    bobSpeed: 0.12,
    bobAmount: 0.13,
    breathAmount: 0.24,
  },

  // === MIDDLE LAYER (radius 9-10) - 5 clouds ===
  {
    id: 'mid-cream-1',
    sphereIndex: 0,
    layerTotal: 5,
    radius: 9,
    color: '#f4ede4', // Warm cream
    opacity: 0.35,
    orbitSpeed: 0.008,
    segments: 24,
    bounds: [6, 2, 4],
    volume: 4,
    fade: 16,
    layer: 'middle',
    bobSpeed: 0.08,
    bobAmount: 0.2,
    breathAmount: 0.35,
  },
  {
    id: 'mid-ivory-2',
    sphereIndex: 1,
    layerTotal: 5,
    radius: 9.5,
    color: '#f6f2ed', // Soft ivory
    opacity: 0.32,
    orbitSpeed: 0.007,
    segments: 22,
    bounds: [5.5, 1.8, 3.5],
    volume: 3.5,
    fade: 14,
    layer: 'middle',
    bobSpeed: 0.09,
    bobAmount: 0.18,
    breathAmount: 0.3,
  },
  {
    id: 'mid-mist-3',
    sphereIndex: 2,
    layerTotal: 5,
    radius: 10,
    color: '#f0e9e0', // Warm mist
    opacity: 0.3,
    orbitSpeed: 0.009,
    segments: 20,
    bounds: [5, 1.5, 3],
    volume: 3,
    fade: 13,
    layer: 'middle',
    bobSpeed: 0.11,
    bobAmount: 0.16,
    breathAmount: 0.28,
  },
  {
    id: 'mid-linen-4',
    sphereIndex: 3,
    layerTotal: 5,
    radius: 9.2,
    color: '#f5efe6', // Soft linen
    opacity: 0.28,
    orbitSpeed: 0.006,
    segments: 18,
    bounds: [5, 1.5, 3],
    volume: 3,
    fade: 14,
    layer: 'middle',
    bobSpeed: 0.085,
    bobAmount: 0.19,
    breathAmount: 0.32,
  },
  {
    id: 'mid-pearl-5',
    sphereIndex: 4,
    layerTotal: 5,
    radius: 9.8,
    color: '#f8f3ee', // Pearl white
    opacity: 0.26,
    orbitSpeed: 0.0075,
    segments: 19,
    bounds: [5.5, 1.6, 3.5],
    volume: 3,
    fade: 12,
    layer: 'middle',
    bobSpeed: 0.1,
    bobAmount: 0.17,
    breathAmount: 0.26,
  },

  // === OUTER LAYER (radius 11-13) - 4 clouds, largest and most ethereal ===
  {
    id: 'outer-cream-1',
    sphereIndex: 0,
    layerTotal: 4,
    radius: 11,
    color: '#f2ebe2', // Warm cream
    opacity: 0.38,
    orbitSpeed: 0.005,
    segments: 28,
    bounds: [8, 2.5, 5],
    volume: 5,
    fade: 20,
    layer: 'outer',
    bobSpeed: 0.04,
    bobAmount: 0.25,
    breathAmount: 0.4,
  },
  {
    id: 'outer-ivory-2',
    sphereIndex: 1,
    layerTotal: 4,
    radius: 12,
    color: '#f6f0e8', // Soft ivory
    opacity: 0.34,
    orbitSpeed: 0.004,
    segments: 26,
    bounds: [7, 2, 4.5],
    volume: 4.5,
    fade: 18,
    layer: 'outer',
    bobSpeed: 0.05,
    bobAmount: 0.22,
    breathAmount: 0.35,
  },
  {
    id: 'outer-mist-3',
    sphereIndex: 2,
    layerTotal: 4,
    radius: 13,
    color: '#f0e8e0', // Warm mist
    opacity: 0.3,
    orbitSpeed: 0.0045,
    segments: 25,
    bounds: [7.5, 2.2, 5],
    volume: 4,
    fade: 19,
    layer: 'outer',
    bobSpeed: 0.045,
    bobAmount: 0.24,
    breathAmount: 0.38,
  },
  {
    id: 'outer-linen-4',
    sphereIndex: 3,
    layerTotal: 4,
    radius: 11.5,
    color: '#f4ede5', // Soft linen
    opacity: 0.32,
    orbitSpeed: 0.0055,
    segments: 24,
    bounds: [7, 2, 4],
    volume: 4,
    fade: 17,
    layer: 'outer',
    bobSpeed: 0.055,
    bobAmount: 0.2,
    breathAmount: 0.36,
  },
];

// Reusable objects to avoid GC pressure
const _tempDirection = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);

/**
 * Individual cloud with spherical positioning and local-space animation
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
  const timeOffset = useRef(Math.random() * 100); // Random phase for variation

  // Calculate initial position on Fibonacci sphere
  const initialDirection = useMemo(
    () => getFibonacciSpherePoint(config.sphereIndex, config.layerTotal),
    [config.sphereIndex, config.layerTotal],
  );

  // Track accumulated orbit angle
  const orbitAngleRef = useRef(0);

  // Animate position each frame (local-space, works with parent rotation)
  useFrame((state) => {
    if (!cloudRef.current) return;

    const time = state.clock.elapsedTime + timeOffset.current;

    // Slow orbital drift around the Y axis
    orbitAngleRef.current += config.orbitSpeed * baseSpeed * 0.016;

    // Apply orbit to direction
    _tempDirection.copy(initialDirection);
    _tempDirection.applyAxisAngle(_yAxis, orbitAngleRef.current);

    // Gentle bobbing (radial breathing)
    const breathOffset = Math.sin(time * 0.2) * config.breathAmount;
    const bobOffset = Math.sin(time * config.bobSpeed) * config.bobAmount;

    // Calculate final position
    const finalRadius = config.radius + breathOffset;
    cloudRef.current.position.set(
      _tempDirection.x * finalRadius,
      _tempDirection.y * finalRadius + bobOffset,
      _tempDirection.z * finalRadius,
    );
  });

  const finalOpacity = config.opacity * baseOpacity;

  // Initial position for first render
  const initialPosition: [number, number, number] = [
    initialDirection.x * config.radius,
    initialDirection.y * config.radius,
    initialDirection.z * config.radius,
  ];

  return (
    <group ref={cloudRef} position={initialPosition}>
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
 * CloudSystem - Spherically distributed clouds around the globe
 *
 * The entire cloud system is wrapped in memo() with no dependencies,
 * ensuring clouds are created ONCE and never re-render from parent changes.
 *
 * Clouds rotate with the globe/shards when the user drags because they're
 * inside the MomentumControls group, while maintaining subtle local animations.
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
