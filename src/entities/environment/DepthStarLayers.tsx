/**
 * DepthStarLayers - Multi-layer star field for depth perception
 *
 * Replaces single-depth star field with 3 layers at different distances:
 * - Near stars (radius 50): Brighter, larger, potentially colored
 * - Mid stars (radius 100): White, medium brightness
 * - Far stars (radius 180): Tiny, faint, dense
 *
 * Creates parallax effect during camera movement and sense of infinite space.
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

interface DepthStarLayersProps {
  /** Enable/disable star layers */
  enabled?: boolean;
  /** Overall opacity multiplier */
  opacity?: number;
  /** Twinkle intensity (0-1) */
  twinkle?: number;
  /** Rotation speed multiplier */
  rotationSpeed?: number;
}

interface StarLayerProps {
  radius: number;
  count: number;
  size: number;
  opacity: number;
  twinkle: number;
  rotationSpeed: number;
  color?: string;
}

function StarLayer({
  radius,
  count,
  size,
  opacity,
  twinkle,
  rotationSpeed,
  color = '#ffffff',
}: StarLayerProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate positions on a sphere
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Spherical distribution (Fibonacci sphere would be better but this is simpler)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.9 + Math.random() * 0.2); // Some radius variation

      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = r * Math.cos(phi);
    }

    return pos;
  }, [count, radius]);

  // Twinkle animation
  useFrame((state) => {
    if (!pointsRef.current) return;

    // Slow rotation
    pointsRef.current.rotation.y += 0.0001 * rotationSpeed;
    pointsRef.current.rotation.x += 0.00005 * rotationSpeed;

    // Update opacities for twinkle effect
    if (twinkle > 0) {
      const time = state.clock.elapsedTime;

      // We can't easily animate per-point opacity with PointsMaterial
      // So we'll use a subtle scale pulse instead
      const scale = 1 + Math.sin(time * 0.5) * 0.02 * twinkle;
      pointsRef.current.scale.setScalar(scale);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function DepthStarLayers({
  enabled = true,
  opacity = 1,
  twinkle = 0.5,
  rotationSpeed = 1,
}: DepthStarLayersProps) {
  if (!enabled) return null;

  const { NEAR, MID, FAR } = SCENE_DEPTH.STAR_LAYERS;

  return (
    <group name="depth-star-layers">
      {/* Near stars - slightly warm tint */}
      <StarLayer
        radius={NEAR.radius}
        count={NEAR.count}
        size={NEAR.size}
        opacity={NEAR.opacity * opacity}
        twinkle={twinkle}
        rotationSpeed={rotationSpeed * 1.5}
        color="#fff8f0"
      />
      {/* Mid stars - pure white */}
      <StarLayer
        radius={MID.radius}
        count={MID.count}
        size={MID.size}
        opacity={MID.opacity * opacity}
        twinkle={twinkle * 0.5}
        rotationSpeed={rotationSpeed}
        color="#ffffff"
      />
      {/* Far stars - slightly cool tint */}
      <StarLayer
        radius={FAR.radius}
        count={FAR.count}
        size={FAR.size}
        opacity={FAR.opacity * opacity}
        twinkle={twinkle * 0.2}
        rotationSpeed={rotationSpeed * 0.5}
        color="#f0f4ff"
      />
    </group>
  );
}
