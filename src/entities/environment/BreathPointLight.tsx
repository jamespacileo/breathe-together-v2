/**
 * BreathPointLight - Breath-synchronized point light with color and intensity animation.
 * Provides dynamic warm-cool color transitions and intensity modulation based on breathing phase.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

interface BreathPointLightProps {
  /**
   * Atmospheric density multiplier for light intensity
   * @min 0
   * @max 1
   * @step 0.1
   * @default 0.5
   */
  atmosphere?: number;
}

const LIGHT_POSITION: [number, number, number] = [0, 5, 5];
const LIGHT_COLOR_EXHALE = '#4a7b8a'; // Deep teal-blue (calming, cool)
const LIGHT_COLOR_INHALE = '#f0c090'; // Soft peach-gold (warm, energizing)
const LIGHT_DISTANCE = 20;
const LIGHT_DECAY = 2;

export function BreathPointLight({ atmosphere = 0.5 }: BreathPointLightProps) {
  const lightRef = useRef<THREE.PointLight>(null);
  const world = useWorld();

  const colorInhale = new THREE.Color(LIGHT_COLOR_INHALE);
  const colorExhale = new THREE.Color(LIGHT_COLOR_EXHALE);

  useFrame((_state, _delta) => {
    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (!breathEntity || !world.has(breathEntity)) return;

      const phase = breathEntity.get(breathPhase)?.value ?? 0;

      if (lightRef.current) {
        // Animate light intensity: 0.3 (exhale) → 1.2 (inhale)
        lightRef.current.intensity = (0.3 + phase * 0.9) * atmosphere;

        // Smooth color lerp: Cool teal (exhale) → Warm peach (inhale)
        lightRef.current.color.copy(colorExhale).lerp(colorInhale, phase);

        // Animated position: rise on inhale (y: 5 → 7), lower on exhale
        lightRef.current.position.y = 5 + phase * 2;
      }
    } catch (_e) {
      // Silently catch ECS errors during unmount/remount
    }
  });

  return (
    <pointLight
      ref={lightRef}
      position={LIGHT_POSITION}
      color={LIGHT_COLOR_EXHALE}
      distance={LIGHT_DISTANCE}
      decay={LIGHT_DECAY}
    />
  );
}
