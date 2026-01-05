/**
 * DepthParticleLayers - Multi-layer atmospheric particles for depth perception
 *
 * Creates parallax depth effect through 3 particle layers at different Z-depths:
 * - Near layer: Larger, brighter particles that move faster
 * - Mid layer: Medium particles with moderate movement
 * - Far layer: Small, faint particles that drift slowly
 *
 * Each layer responds to camera movement at different rates, creating
 * a convincing sense of 3D space and depth.
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

interface DepthParticleLayersProps {
  /** Enable/disable the depth particle system */
  enabled?: boolean;
  /** Overall opacity multiplier */
  opacity?: number;
  /** Base color for all particles */
  color?: string;
  /** Speed multiplier for all layers */
  speedMultiplier?: number;
}

interface ParticleLayerProps {
  z: number;
  opacity: number;
  size: number;
  count: number;
  speed: number;
  color: string;
}

function ParticleLayer({ z, opacity, size, count, speed, color }: ParticleLayerProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  // Generate random positions on a plane at depth Z
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spread = Math.abs(z) * 1.5; // Wider spread for distant layers

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Distribute in a wide rectangular area
      pos[i3] = (Math.random() - 0.5) * spread * 2;
      pos[i3 + 1] = (Math.random() - 0.5) * spread;
      pos[i3 + 2] = z + (Math.random() - 0.5) * 10; // Some Z variation
    }
    return pos;
  }, [count, z]);

  // Per-particle velocity for organic movement
  const velocities = useMemo(() => {
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      vel[i3] = (Math.random() - 0.5) * 0.02; // X drift
      vel[i3 + 1] = (Math.random() - 0.5) * 0.01; // Y drift
      vel[i3 + 2] = 0; // No Z movement
    }
    return vel;
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    const spread = Math.abs(z) * 1.5;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Apply velocity with speed modifier
      posArray[i3] += velocities[i3] * speed * delta * 60;
      posArray[i3 + 1] += velocities[i3 + 1] * speed * delta * 60;

      // Add gentle sine wave motion
      posArray[i3] += Math.sin(time * 0.3 + i * 0.1) * 0.001 * speed;
      posArray[i3 + 1] += Math.cos(time * 0.2 + i * 0.15) * 0.001 * speed;

      // Wrap around boundaries
      if (posArray[i3] > spread) posArray[i3] = -spread;
      if (posArray[i3] < -spread) posArray[i3] = spread;
      if (posArray[i3 + 1] > spread * 0.5) posArray[i3 + 1] = -spread * 0.5;
      if (posArray[i3 + 1] < -spread * 0.5) posArray[i3 + 1] = spread * 0.5;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={size}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function DepthParticleLayers({
  enabled = true,
  opacity = 1,
  color = '#e8dcd0',
  speedMultiplier = 1,
}: DepthParticleLayersProps) {
  if (!enabled) return null;

  const { NEAR, MID, FAR } = SCENE_DEPTH.ATMOSPHERE_LAYERS;

  return (
    <group name="depth-particle-layers">
      <ParticleLayer
        z={NEAR.z}
        opacity={NEAR.opacity * opacity}
        size={NEAR.size}
        count={NEAR.count}
        speed={NEAR.speed * speedMultiplier}
        color={color}
      />
      <ParticleLayer
        z={MID.z}
        opacity={MID.opacity * opacity}
        size={MID.size}
        count={MID.count}
        speed={MID.speed * speedMultiplier}
        color={color}
      />
      <ParticleLayer
        z={FAR.z}
        opacity={FAR.opacity * opacity}
        size={FAR.size}
        count={FAR.count}
        speed={FAR.speed * speedMultiplier}
        color={color}
      />
    </group>
  );
}
