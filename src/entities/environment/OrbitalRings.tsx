/**
 * OrbitalRings - Subtle ring/halo elements at multiple Z-depths
 *
 * Creates ethereal orbital rings that suggest planetary/cosmic scale:
 * - Inner ring (Z: -5): Behind globe, most visible
 * - Mid ring (Z: -25): Mid-distance halo
 * - Outer ring (Z: -60): Faint distant ring
 *
 * Rings are dotted/dashed for a delicate appearance.
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

interface OrbitalRingsProps {
  /** Enable/disable orbital rings */
  enabled?: boolean;
  /** Overall opacity multiplier */
  opacity?: number;
  /** Ring color */
  color?: string;
  /** Rotation speed multiplier */
  rotationSpeed?: number;
  /** Number of segments (dots) per ring */
  segments?: number;
}

interface RingLayerProps {
  z: number;
  radius: number;
  opacity: number;
  color: string;
  rotationSpeed: number;
  segments: number;
  tilt: [number, number, number];
}

function RingLayer({ z, radius, opacity, color, rotationSpeed, segments, tilt }: RingLayerProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Generate dotted ring positions
  const positions = useMemo(() => {
    const pos = new Float32Array(segments * 3);

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const i3 = i * 3;
      pos[i3] = Math.cos(angle) * radius;
      pos[i3 + 1] = Math.sin(angle) * radius;
      pos[i3 + 2] = 0;
    }

    return pos;
  }, [segments, radius]);

  // Slow rotation
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.z = state.clock.elapsedTime * 0.02 * rotationSpeed;
  });

  const dotSize = Math.max(0.02, radius * 0.008);

  return (
    <group ref={groupRef} position={[0, 0, z]} rotation={tilt as unknown as THREE.Euler}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={dotSize}
          color={color}
          transparent
          opacity={opacity}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}

export function OrbitalRings({
  enabled = true,
  opacity = 1,
  color = '#d4c4b4',
  rotationSpeed = 1,
  segments = 64,
}: OrbitalRingsProps) {
  if (!enabled) return null;

  const { INNER, MID, OUTER } = SCENE_DEPTH.RINGS;

  return (
    <group name="orbital-rings">
      {/* Inner ring - slight tilt, fastest rotation */}
      <RingLayer
        z={INNER.z}
        radius={INNER.radius}
        opacity={INNER.opacity * opacity}
        color={color}
        rotationSpeed={rotationSpeed * 1.2}
        segments={segments}
        tilt={[Math.PI * 0.4, 0, 0]}
      />
      {/* Mid ring - different tilt angle */}
      <RingLayer
        z={MID.z}
        radius={MID.radius}
        opacity={MID.opacity * opacity}
        color={color}
        rotationSpeed={rotationSpeed * 0.8}
        segments={Math.floor(segments * 1.5)}
        tilt={[Math.PI * 0.35, 0.2, 0]}
      />
      {/* Outer ring - nearly horizontal, slowest */}
      <RingLayer
        z={OUTER.z}
        radius={OUTER.radius}
        opacity={OUTER.opacity * opacity}
        color={color}
        rotationSpeed={rotationSpeed * 0.4}
        segments={segments * 2}
        tilt={[Math.PI * 0.45, -0.1, 0]}
      />
    </group>
  );
}
