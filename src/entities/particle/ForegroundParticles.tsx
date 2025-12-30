/**
 * ForegroundParticles - Layered depth particles for atmospheric effect
 *
 * Features:
 * - Multiple layers of particles at different depths
 * - Creates sense of depth and atmosphere
 * - Breathing-synchronized opacity and drift
 * - Soft, dust-like particles that drift across the view
 */

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef } from 'react';
import type * as THREE from 'three';
import { breathPhase } from '../breath/traits';

export interface ForegroundParticlesProps {
  /**
   * Number of particles per layer.
   * @default 50
   */
  countPerLayer?: number;

  /**
   * Base opacity for particles.
   * @default 0.15
   */
  baseOpacity?: number;

  /**
   * Enable breathing synchronization.
   * @default true
   */
  breathingSyncEnabled?: boolean;
}

/**
 * ForegroundParticles - Creates layered atmospheric depth
 *
 * Renders multiple Sparkles layers at different z-depths:
 * - Far background layer (z = -15)
 * - Mid-background layer (z = -8)
 * - Foreground layer (z = 3)
 * - Near foreground layer (z = 6)
 */
export function ForegroundParticles({
  countPerLayer = 50,
  baseOpacity = 0.15,
  breathingSyncEnabled = true,
}: ForegroundParticlesProps = {}) {
  const world = useWorld();

  // Refs for each layer
  const farLayerRef = useRef<THREE.Group>(null);
  const midLayerRef = useRef<THREE.Group>(null);
  const foregroundLayerRef = useRef<THREE.Group>(null);
  const nearLayerRef = useRef<THREE.Group>(null);

  // Get breath phase
  const getBreathPhase = (): number => {
    if (!breathingSyncEnabled) return 0.5;
    try {
      const breathEntity = world?.queryFirst?.(breathPhase);
      return breathEntity?.get?.(breathPhase)?.value ?? 0.5;
    } catch {
      return 0.5;
    }
  };

  // Animate layers with parallax and breathing
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const phase = getBreathPhase();

    // Far layer - slowest movement
    if (farLayerRef.current) {
      farLayerRef.current.rotation.y = Math.sin(t * 0.02) * 0.1;
      farLayerRef.current.position.y = Math.sin(t * 0.03) * 0.3;
    }

    // Mid layer - medium movement
    if (midLayerRef.current) {
      midLayerRef.current.rotation.y = Math.sin(t * 0.03 + 1) * 0.15;
      midLayerRef.current.position.y = Math.cos(t * 0.04) * 0.4 + phase * 0.2;
    }

    // Foreground layer - faster, more noticeable
    if (foregroundLayerRef.current) {
      foregroundLayerRef.current.rotation.y = Math.sin(t * 0.05 + 2) * 0.2;
      foregroundLayerRef.current.rotation.x = Math.cos(t * 0.04) * 0.1;
      foregroundLayerRef.current.position.y = Math.sin(t * 0.06) * 0.5 + phase * 0.3;
      // Scale with breathing - foreground expands on exhale
      const foregroundScale = 1 + (1 - phase) * 0.1;
      foregroundLayerRef.current.scale.setScalar(foregroundScale);
    }

    // Near layer - closest, most movement
    if (nearLayerRef.current) {
      nearLayerRef.current.rotation.y = Math.sin(t * 0.06 + 3) * 0.25;
      nearLayerRef.current.rotation.x = Math.cos(t * 0.05 + 1) * 0.12;
      nearLayerRef.current.position.y = Math.cos(t * 0.07) * 0.6;
      // Push forward with breathing
      nearLayerRef.current.position.z = 6 + phase * 0.5;
    }
  });

  return (
    <>
      {/* Far background particles - barely visible, creates depth */}
      <group ref={farLayerRef} position={[0, 0, -15]}>
        <Sparkles
          count={countPerLayer}
          scale={20}
          size={0.04}
          speed={0.2}
          opacity={baseOpacity * 0.5}
          color="#d0c8c0"
        />
      </group>

      {/* Mid-background particles */}
      <group ref={midLayerRef} position={[0, 0, -8]}>
        <Sparkles
          count={countPerLayer}
          scale={15}
          size={0.06}
          speed={0.3}
          opacity={baseOpacity * 0.7}
          color="#c8c0b8"
        />
      </group>

      {/* Foreground particles - more visible */}
      <group ref={foregroundLayerRef} position={[0, 0, 3]}>
        <Sparkles
          count={Math.floor(countPerLayer * 0.7)}
          scale={12}
          size={0.05}
          speed={0.4}
          opacity={baseOpacity * 0.4}
          color="#e0d8d0"
        />
      </group>

      {/* Near foreground particles - closest, soft blur effect */}
      <group ref={nearLayerRef} position={[0, 0, 6]}>
        <Sparkles
          count={Math.floor(countPerLayer * 0.5)}
          scale={10}
          size={0.08}
          speed={0.5}
          opacity={baseOpacity * 0.25}
          color="#f0e8e0"
        />
      </group>
    </>
  );
}
