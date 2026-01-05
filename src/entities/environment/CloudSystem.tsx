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

import { Cloud, Clouds, Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface CloudConfig {
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

// Cloud configurations - spherically distributed with extended depth
// LAYERS (expanded for better spatial depth):
// - Inner layer (radius 10-12): 6 clouds, moderate proximity
// - Middle layer (radius 16-19): 5 clouds, midground depth
// - Outer layer (radius 23-28): 4 clouds, near viewport boundaries
export const CLOUD_CONFIGS: CloudConfig[] = [
  // === INNER LAYER (radius 10-12) - 6 clouds, lighter teals (closest to viewer) ===
  {
    id: 'inner-teal-1',
    sphereIndex: 0,
    layerTotal: 6,
    radius: 10,
    color: '#7acade', // Light teal
    opacity: 0.35,
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
    id: 'inner-teal-2',
    sphereIndex: 1,
    layerTotal: 6,
    radius: 10.8,
    color: '#5fb8ce', // Medium light teal
    opacity: 0.32,
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
    id: 'inner-teal-3',
    sphereIndex: 2,
    layerTotal: 6,
    radius: 11.5,
    color: '#6fc3d9', // Bright teal
    opacity: 0.3,
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
    id: 'inner-teal-4',
    sphereIndex: 3,
    layerTotal: 6,
    radius: 10.3,
    color: '#5fb8ce', // Light teal
    opacity: 0.28,
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
    id: 'inner-teal-5',
    sphereIndex: 4,
    layerTotal: 6,
    radius: 11.2,
    color: '#7acade', // Pale teal
    opacity: 0.25,
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
    id: 'inner-teal-6',
    sphereIndex: 5,
    layerTotal: 6,
    radius: 10.5,
    color: '#6fc3d9', // Light teal
    opacity: 0.3,
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

  // === MIDDLE LAYER (radius 16-19) - 5 clouds, mid teals (midground depth) ===
  {
    id: 'mid-teal-1',
    sphereIndex: 0,
    layerTotal: 5,
    radius: 16,
    color: '#4da6bd', // Mid teal
    opacity: 0.38,
    orbitSpeed: 0.008,
    segments: 24,
    bounds: [8, 2.5, 5],
    volume: 5,
    fade: 20,
    layer: 'middle',
    bobSpeed: 0.08,
    bobAmount: 0.2,
    breathAmount: 0.35,
  },
  {
    id: 'mid-teal-2',
    sphereIndex: 1,
    layerTotal: 5,
    radius: 17,
    color: '#3a96ae', // Teal cyan
    opacity: 0.35,
    orbitSpeed: 0.007,
    segments: 22,
    bounds: [7.5, 2.2, 4.5],
    volume: 4.5,
    fade: 18,
    layer: 'middle',
    bobSpeed: 0.09,
    bobAmount: 0.18,
    breathAmount: 0.3,
  },
  {
    id: 'mid-teal-3',
    sphereIndex: 2,
    layerTotal: 5,
    radius: 18,
    color: '#2d7a8f', // Deep teal
    opacity: 0.32,
    orbitSpeed: 0.009,
    segments: 20,
    bounds: [7, 2, 4],
    volume: 4,
    fade: 17,
    layer: 'middle',
    bobSpeed: 0.11,
    bobAmount: 0.16,
    breathAmount: 0.28,
  },
  {
    id: 'mid-teal-4',
    sphereIndex: 3,
    layerTotal: 5,
    radius: 16.5,
    color: '#4da6bd', // Mid teal
    opacity: 0.3,
    orbitSpeed: 0.006,
    segments: 18,
    bounds: [7, 2, 4],
    volume: 4,
    fade: 18,
    layer: 'middle',
    bobSpeed: 0.085,
    bobAmount: 0.19,
    breathAmount: 0.32,
  },
  {
    id: 'mid-teal-5',
    sphereIndex: 4,
    layerTotal: 5,
    radius: 17.5,
    color: '#3a96ae', // Teal cyan
    opacity: 0.28,
    orbitSpeed: 0.0075,
    segments: 19,
    bounds: [7.5, 2.2, 4.5],
    volume: 4,
    fade: 16,
    layer: 'middle',
    bobSpeed: 0.1,
    bobAmount: 0.17,
    breathAmount: 0.26,
  },

  // === OUTER LAYER (radius 23-28) - 4 clouds, dark navies (background) ===
  {
    id: 'outer-navy-1',
    sphereIndex: 0,
    layerTotal: 4,
    radius: 23,
    color: '#152b4d', // Dark navy
    opacity: 0.35,
    orbitSpeed: 0.005,
    segments: 28,
    bounds: [10, 3, 6],
    volume: 6,
    fade: 25,
    layer: 'outer',
    bobSpeed: 0.04,
    bobAmount: 0.25,
    breathAmount: 0.4,
  },
  {
    id: 'outer-navy-2',
    sphereIndex: 1,
    layerTotal: 4,
    radius: 25,
    color: '#1a3352', // Deep navy
    opacity: 0.3,
    orbitSpeed: 0.004,
    segments: 26,
    bounds: [9, 2.8, 5.5],
    volume: 5.5,
    fade: 23,
    layer: 'outer',
    bobSpeed: 0.05,
    bobAmount: 0.22,
    breathAmount: 0.35,
  },
  {
    id: 'outer-navy-3',
    sphereIndex: 2,
    layerTotal: 4,
    radius: 27,
    color: '#0d2d45', // Dark teal navy
    opacity: 0.28,
    orbitSpeed: 0.0045,
    segments: 25,
    bounds: [9.5, 3, 6],
    volume: 5.5,
    fade: 24,
    layer: 'outer',
    bobSpeed: 0.045,
    bobAmount: 0.24,
    breathAmount: 0.38,
  },
  {
    id: 'outer-navy-4',
    sphereIndex: 3,
    layerTotal: 4,
    radius: 24,
    color: '#152b4d', // Dark navy
    opacity: 0.3,
    orbitSpeed: 0.0055,
    segments: 24,
    bounds: [9, 2.8, 5.5],
    volume: 5.5,
    fade: 22,
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
      {/* Subtle golden sparkles around cloud for magical night sky atmosphere */}
      <Sparkles
        count={5}
        scale={config.bounds[0] * 1.2}
        size={2}
        speed={0.3}
        opacity={0.4}
        color="#ffdb6b"
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
