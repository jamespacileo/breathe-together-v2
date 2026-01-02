/**
 * ColorTemperature - Breath-synchronized ambient color shift
 *
 * Creates a subtle warm/cool color shift with breathing:
 * - Inhale: Warmer tones (energy entering, activation)
 * - Hold-in: Peak warmth
 * - Exhale: Cooler tones (calming release)
 * - Hold-out: Neutral/cool
 *
 * This affects the ambient light color to create a psychological
 * temperature association with the breathing cycle.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

export interface ColorTemperatureProps {
  /** Enable/disable color temperature shift @default true */
  enabled?: boolean;
  /** Warm color (inhale) @default '#fff5eb' */
  warmColor?: string;
  /** Cool color (exhale) @default '#e8f4ff' */
  coolColor?: string;
  /** Strength of color shift (0-1) @default 0.3 */
  strength?: number;
}

/**
 * ColorTemperature - Applies breath-synchronized color grading
 *
 * Modifies the scene's background and fog color (if present) to shift
 * between warm and cool tones based on breathing phase.
 */
export function ColorTemperature({
  enabled = true,
  warmColor = '#fff5eb',
  coolColor = '#e8f4ff',
  strength = 0.3,
}: ColorTemperatureProps) {
  const world = useWorld();
  const { scene } = useThree();

  // Pre-allocate color objects
  const warmColorObj = useMemo(() => new THREE.Color(warmColor), [warmColor]);
  const coolColorObj = useMemo(() => new THREE.Color(coolColor), [coolColor]);
  const baseColorRef = useRef<THREE.Color | null>(null);
  const resultColor = useMemo(() => new THREE.Color(), []);

  // Store the original background color on mount
  useEffect(() => {
    if (scene.background instanceof THREE.Color) {
      baseColorRef.current = scene.background.clone();
    }
  }, [scene]);

  // Update color based on breathing phase
  useFrame(() => {
    if (!enabled || !baseColorRef.current) return;

    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (!breathEntity) return;

      const phase = breathEntity.get(breathPhase)?.value ?? 0;

      // Lerp between cool (exhale) and warm (inhale)
      resultColor.copy(coolColorObj).lerp(warmColorObj, phase);

      // Apply strength - blend between base color and temperature-shifted color
      resultColor.lerp(baseColorRef.current, 1 - strength);

      // Apply to scene background if it's a color
      if (scene.background instanceof THREE.Color) {
        scene.background.copy(resultColor);
      }

      // Apply to fog if present
      if (scene.fog && 'color' in scene.fog) {
        (scene.fog as THREE.Fog).color.copy(resultColor);
      }
    } catch {
      // Ignore ECS errors during unmount
    }
  });

  // This component doesn't render anything - it just modifies scene properties
  return null;
}

export default ColorTemperature;
