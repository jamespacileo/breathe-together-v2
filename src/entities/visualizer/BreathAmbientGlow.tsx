/**
 * BreathAmbientGlow - Ambient light that shifts color based on breath phase
 *
 * Inspired by: Chromatic audio spectrum displays / color organ visualizers
 *
 * A soft ambient point light that subtly shifts through the Monument Valley
 * color palette as you breathe. Creates a gentle, ever-changing atmosphere.
 *
 * Color journey per breath cycle:
 * - Inhale: Warm gold → Teal (gathering energy)
 * - Hold-in: Teal glow (steady presence)
 * - Exhale: Teal → Deep blue → Rose (release spectrum)
 * - Hold-out: Rose glow (peaceful)
 *
 * Visual effect: The entire scene takes on subtle color tints that shift
 * with each breath, creating a synesthetic breathing experience.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { breathPhase, phaseType } from '../breath/traits';

/**
 * Phase colors (Monument Valley palette)
 */
const PHASE_COLORS = {
  0: new THREE.Color('#ffbe0b'), // Inhale: Warm Gold
  1: new THREE.Color('#06d6a0'), // Hold-in: Teal
  2: new THREE.Color('#118ab2'), // Exhale: Deep Blue
  3: new THREE.Color('#ef476f'), // Hold-out: Rose
};

/**
 * Lerp color helper
 */
function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

interface BreathAmbientGlowProps {
  /** Enable/disable the effect @default true */
  enabled?: boolean;
  /** Light intensity @default 0.4 */
  intensity?: number;
  /** Light distance @default 20 */
  distance?: number;
  /** Position of the light @default [0, 5, 0] */
  position?: [number, number, number];
  /** Enable secondary rim light @default true */
  enableRimLight?: boolean;
}

/**
 * BreathAmbientGlow - Ambient light that shifts color with breathing
 */
export function BreathAmbientGlow({
  enabled = true,
  intensity = 0.4,
  distance = 20,
  position = [0, 5, 0],
  enableRimLight = true,
}: BreathAmbientGlowProps) {
  const world = useWorld();
  const mainLightRef = useRef<THREE.PointLight>(null);
  const rimLightRef = useRef<THREE.PointLight>(null);

  // Pre-allocate color for smooth transitions
  const currentColor = useMemo(() => new THREE.Color('#ffbe0b'), []);
  const targetColor = useMemo(() => new THREE.Color('#ffbe0b'), []);

  useFrame((_, delta) => {
    if (!enabled) return;

    try {
      // Get current breath state
      const breathEntity = world.queryFirst(breathPhase);
      if (!breathEntity) return;

      const currentPhase = breathEntity.get(breathPhase)?.value ?? 0;
      const currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;

      // Calculate target color based on phase and progress
      // This creates smooth color transitions within each phase
      const phaseColor = PHASE_COLORS[currentPhaseType as keyof typeof PHASE_COLORS];
      const nextPhaseType = (currentPhaseType + 1) % 4;
      const nextPhaseColor = PHASE_COLORS[nextPhaseType as keyof typeof PHASE_COLORS];

      // Progress within current phase (0-1)
      let progress: number;
      switch (currentPhaseType) {
        case 0: // Inhale: 0→1 maps to progress through inhale
          progress = currentPhase;
          break;
        case 1: // Hold-in: stay at inhaled color
          progress = 0;
          break;
        case 2: // Exhale: 1→0 maps to progress through exhale
          progress = 1 - currentPhase;
          break;
        case 3: // Hold-out: stay at exhaled color
          progress = 0;
          break;
        default:
          progress = 0;
      }

      // Smoothly blend between current and next phase color
      targetColor.copy(lerpColor(phaseColor, nextPhaseColor, progress * 0.5));

      // Smooth transition to target color
      currentColor.lerp(targetColor, delta * 3);

      // Update main light
      if (mainLightRef.current) {
        mainLightRef.current.color.copy(currentColor);
        // Pulse intensity with breath
        mainLightRef.current.intensity = intensity * (0.8 + currentPhase * 0.4);
      }

      // Update rim light (complementary color, positioned opposite)
      if (rimLightRef.current && enableRimLight) {
        // Use a complementary/contrasting hue
        const rimHsl = { h: 0, s: 0, l: 0 };
        currentColor.getHSL(rimHsl);
        const complementaryHue = (rimHsl.h + 0.3) % 1; // Offset hue
        rimLightRef.current.color.setHSL(complementaryHue, rimHsl.s * 0.7, rimHsl.l);
        rimLightRef.current.intensity = intensity * 0.3 * (0.6 + currentPhase * 0.4);
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  if (!enabled) return null;

  return (
    <group name="Breath Ambient Glow">
      {/* Main ambient glow */}
      <pointLight
        ref={mainLightRef}
        position={position}
        intensity={intensity}
        distance={distance}
        decay={2}
        color="#ffbe0b"
      />

      {/* Rim light for depth (positioned below and behind) */}
      {enableRimLight && (
        <pointLight
          ref={rimLightRef}
          position={[-position[0] * 0.5, -position[1] * 0.8, -position[2] * 0.5]}
          intensity={intensity * 0.3}
          distance={distance * 0.8}
          decay={2}
          color="#118ab2"
        />
      )}
    </group>
  );
}

export default BreathAmbientGlow;
