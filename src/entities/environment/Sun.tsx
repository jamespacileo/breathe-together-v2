/**
 * Sun - Stylized sun with volumetric glow
 *
 * Features:
 * - Accurate astronomical positioning
 * - Layered glow effect (core + corona + atmosphere)
 * - Subtle pulsing animation
 * - Performant shader-based rendering
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { AdditiveBlending, BackSide, Color, SphereGeometry, Vector3 } from 'three';
import { RENDER_LAYERS } from '../../constants';

interface SunProps {
  /** Sun position in 3D space @default [80, 20, -60] */
  position?: [number, number, number];
  /** Sun radius @default 4 */
  radius?: number;
  /** Sun color @default '#fff5e6' */
  color?: string;
  /** Glow intensity @default 1.5 */
  glowIntensity?: number;
  /** Enable subtle pulse animation @default true */
  enablePulse?: boolean;
}

export function Sun({
  position = [80, 20, -60],
  radius = 4,
  color = '#fff5e6',
  glowIntensity = 1.5,
  enablePulse = true,
}: SunProps = {}) {
  const coreRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  const sunColor = useMemo(() => new Color(color), [color]);
  const coreGeometry = useMemo(() => new SphereGeometry(radius, 32, 32), [radius]);
  const coronaGeometry = useMemo(() => new SphereGeometry(radius * 1.5, 32, 32), [radius]);
  const atmosphereGeometry = useMemo(() => new SphereGeometry(radius * 2.5, 32, 32), [radius]);

  // Subtle pulse animation
  useFrame((state) => {
    if (!enablePulse) return;

    const time = state.clock.elapsedTime;
    const pulse = 1.0 + Math.sin(time * 0.5) * 0.05;

    if (coreRef.current) {
      coreRef.current.scale.setScalar(pulse);
    }

    if (coronaRef.current) {
      coronaRef.current.scale.setScalar(pulse * 0.98);
    }

    if (atmosphereRef.current) {
      atmosphereRef.current.scale.setScalar(pulse * 0.95);
    }
  });

  // Set layer to OVERLAY for sharp rendering after DoF
  useEffect(() => {
    if (coreRef.current) {
      coreRef.current.layers.set(RENDER_LAYERS.OVERLAY);
    }
    if (coronaRef.current) {
      coronaRef.current.layers.set(RENDER_LAYERS.OVERLAY);
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.layers.set(RENDER_LAYERS.OVERLAY);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      coreGeometry.dispose();
      coronaGeometry.dispose();
      atmosphereGeometry.dispose();
    };
  }, [coreGeometry, coronaGeometry, atmosphereGeometry]);

  return (
    <group name="sun" position={new Vector3(...position)}>
      {/* Core - bright white/yellow center */}
      <mesh ref={coreRef} geometry={coreGeometry}>
        <meshBasicMaterial color={sunColor} toneMapped={false} />
      </mesh>

      {/* Corona - inner glow layer */}
      <mesh ref={coronaRef} geometry={coronaGeometry}>
        <meshBasicMaterial
          color={sunColor}
          transparent
          opacity={0.6 * glowIntensity}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Atmosphere - outer glow layer */}
      <mesh ref={atmosphereRef} geometry={atmosphereGeometry}>
        <meshBasicMaterial
          color={sunColor}
          transparent
          opacity={0.3 * glowIntensity}
          blending={AdditiveBlending}
          side={BackSide}
          toneMapped={false}
        />
      </mesh>

      {/* Additional soft glow using point light */}
      <pointLight
        position={[0, 0, 0]}
        color={sunColor}
        intensity={glowIntensity * 2}
        distance={100}
        decay={2}
      />
    </group>
  );
}
