/**
 * BreathingBloom - Breath-synchronized bloom post-processing effect
 *
 * Creates an ethereal "breathing light" effect where bloom intensity
 * pulses with the breathing cycle:
 * - Inhale: Bloom intensity increases (warmth, fullness)
 * - Hold-in: Peak bloom, sustained glow
 * - Exhale: Bloom fades (release, letting go)
 *
 * Uses @react-three/postprocessing with selective bloom for performance.
 */

import { useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useWorld } from 'koota/react';
// Import Bloom effect type for ref
import type { BloomEffect } from 'postprocessing';
import { useRef } from 'react';
import { breathPhase } from '../breath/traits';

export interface BreathingBloomProps {
  /** Enable/disable the bloom effect @default true */
  enabled?: boolean;
  /** Minimum bloom intensity (during exhale) @default 0.2 */
  intensityMin?: number;
  /** Maximum bloom intensity (during inhale peak) @default 0.6 */
  intensityMax?: number;
  /** Luminance threshold for bloom @default 0.85 */
  threshold?: number;
  /** Smooth transition at threshold @default 0.3 */
  smoothing?: number;
  /** Blur radius @default 0.4 */
  radius?: number;
}

/**
 * BreathingBloom - Renders breath-synchronized bloom effect
 *
 * This component must be placed as a sibling to your scene content,
 * not inside other components. The EffectComposer will capture the
 * entire scene and apply post-processing.
 */
export function BreathingBloom({
  enabled = true,
  intensityMin = 0.2,
  intensityMax = 0.6,
  threshold = 0.85,
  smoothing = 0.3,
  radius = 0.4,
}: BreathingBloomProps) {
  const bloomRef = useRef<BloomEffect>(null);
  const world = useWorld();

  // Update bloom intensity based on breathing phase
  useFrame(() => {
    if (!enabled || !bloomRef.current) return;

    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhase)?.value ?? 0;
        // Lerp between min and max intensity based on breath phase
        const intensity = intensityMin + phase * (intensityMax - intensityMin);
        bloomRef.current.intensity = intensity;
      }
    } catch {
      // Ignore ECS errors during unmount/remount
    }
  });

  if (!enabled) return null;

  return (
    <EffectComposer>
      <Bloom
        ref={bloomRef}
        intensity={intensityMin}
        luminanceThreshold={threshold}
        luminanceSmoothing={smoothing}
        mipmapBlur
        radius={radius}
      />
    </EffectComposer>
  );
}

export default BreathingBloom;
