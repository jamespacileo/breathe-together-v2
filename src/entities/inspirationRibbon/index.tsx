/**
 * InspirationRibbon - 3D ribbon with inspirational text orbiting the globe
 *
 * A cylindrical band positioned between the EarthGlobe and ParticleSwarm,
 * displaying flowing inspirational text that responds to breathing.
 *
 * Features:
 * - Sine wave vertex distortion for organic rippling
 * - Breath-synced opacity (visible during hold, fades during transitions)
 * - Slow constant rotation for engagement
 * - Frosted glass aesthetic matching the scene
 *
 * Layout:
 * - Globe: radius ~1.5 (center)
 * - Equator ring: radius ~2.4
 * - InspirationRibbon: radius ~3.0 ← this component
 * - ParticleSwarm: radius 4.5-6.0
 *
 * @see https://cydstumpel.nl/ for original ribbon banner inspiration
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { breathPhase, phaseType, rawProgress } from '../breath/traits';
import { createBreathSineMaterial } from './BreathSineMaterial';
import { createTextTexture, RIBBON_MESSAGES, updateTextTexture } from './textTexture';

/**
 * Calculate ribbon opacity based on breath phase
 *
 * Visible during hold (phase 1), fade in during inhale (0), fade out during exhale (2)
 */
function calculateRibbonOpacity(phaseTypeValue: number, progressValue: number): number {
  switch (phaseTypeValue) {
    case 0: // Inhale - fade in during second half
      return progressValue > 0.5 ? (progressValue - 0.5) * 2 : 0;
    case 1: // Hold-in - fully visible
      return 1;
    case 2: // Exhale - fade out during first half
      return progressValue < 0.5 ? 1 - progressValue * 2 : 0;
    default: // Hold-out (3) and any other - hidden
      return 0;
  }
}

export interface InspirationRibbonProps {
  /**
   * Radius of the ribbon cylinder (distance from center)
   * Should be between equator ring (~2.4) and particle orbit (~4.5)
   * @default 3.0
   */
  radius?: number;

  /**
   * Height of the ribbon band
   * @default 0.18
   */
  height?: number;

  /**
   * Base rotation speed (radians per second)
   * Positive = counter-clockwise when viewed from above
   * @default 0.08
   */
  rotationSpeed?: number;

  /**
   * Texture scroll speed multiplier
   * Higher = faster text movement
   * @default 0.02
   */
  scrollSpeed?: number;

  /**
   * Wave amplitude for sine distortion
   * @default 0.02
   */
  waveAmplitude?: number;

  /**
   * Base color of the ribbon (background)
   * @default '#f5f0e8'
   */
  baseColor?: string;

  /**
   * Text/glow color
   * @default '#d4a574'
   */
  glowColor?: string;

  /**
   * Whether to automatically cycle through messages
   * @default true
   */
  cycleMessages?: boolean;

  /**
   * Custom message to display (overrides cycling)
   */
  message?: string;
}

/**
 * InspirationRibbon renders a 3D cylindrical band with flowing text
 */
export function InspirationRibbon({
  radius = 3.0,
  height = 0.18,
  rotationSpeed = 0.08,
  scrollSpeed = 0.02,
  waveAmplitude = 0.02,
  baseColor = '#f5f0e8',
  glowColor = '#d4a574',
  cycleMessages = true,
  message,
}: InspirationRibbonProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  // Message cycling state
  const [messageIndex, setMessageIndex] = useState(0);
  const lastPhaseRef = useRef<number>(-1);

  // Create text texture
  const texture = useMemo(() => {
    const text = message || RIBBON_MESSAGES[messageIndex];
    return createTextTexture({
      text,
      textColor: glowColor,
      fontSize: 56,
      letterSpacing: 0.2,
    });
  }, [message, messageIndex, glowColor]);

  // Create shader material
  const material = useMemo(() => {
    return createBreathSineMaterial(texture, {
      baseColor,
      glowColor,
      waveAmplitude,
    });
  }, [texture, baseColor, glowColor, waveAmplitude]);

  // Create cylinder geometry (open-ended for ribbon effect)
  const geometry = useMemo(() => {
    // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded)
    return new THREE.CylinderGeometry(radius, radius, height, 128, 16, true);
  }, [radius, height]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    };
  }, [geometry, material, texture]);

  // Animation frame update
  useFrame((state) => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const mat = mesh.material as THREE.ShaderMaterial;

    // Get breath state from ECS
    let currentBreathPhase = 0;
    let currentPhaseType = 0;
    let currentProgress = 0;

    try {
      const breathEntity = world.queryFirst(breathPhase, phaseType, rawProgress);
      if (breathEntity) {
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
        currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
        currentProgress = breathEntity.get(rawProgress)?.value ?? 0;
      }
    } catch (_e) {
      // Silently catch ECS errors during unmount/remount in Triplex
    }

    // Update shader uniforms
    mat.uniforms.time.value = state.clock.elapsedTime;
    mat.uniforms.breathPhase.value = currentBreathPhase;
    mat.uniforms.textureOffset.value += scrollSpeed * 0.01;

    // Calculate and smooth opacity for elegant transitions
    const targetOpacity = calculateRibbonOpacity(currentPhaseType, currentProgress);
    mat.uniforms.opacity.value = THREE.MathUtils.lerp(
      mat.uniforms.opacity.value,
      targetOpacity,
      0.1,
    );

    // Rotate the ribbon (opposite to typical rotation for variety)
    mesh.rotation.y += rotationSpeed * 0.016; // Approximate 60fps delta

    // Message cycling: change message at start of each new inhale phase
    if (cycleMessages && !message) {
      if (currentPhaseType === 0 && lastPhaseRef.current !== 0) {
        // New breath cycle started
        setMessageIndex((prev) => (prev + 1) % RIBBON_MESSAGES.length);
      }
      lastPhaseRef.current = currentPhaseType;
    }
  });

  // Update texture when message changes
  useEffect(() => {
    if (!message && cycleMessages) {
      updateTextTexture(texture, {
        text: RIBBON_MESSAGES[messageIndex],
        textColor: glowColor,
        fontSize: 56,
        letterSpacing: 0.2,
      });
    }
  }, [messageIndex, message, cycleMessages, texture, glowColor]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[Math.PI / 2, 0, 0]} // Rotate to horizontal (XZ plane)
    />
  );
}

export default InspirationRibbon;
