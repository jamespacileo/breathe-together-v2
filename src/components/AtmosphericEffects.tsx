/**
 * AtmosphericEffects - Postprocessing effects for soft atmospheric feel
 *
 * Features:
 * - Soft bloom for ethereal glow
 * - Subtle vignette for focus
 * - Breathing-synchronized intensity
 */

import { useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { useWorld } from 'koota/react';
import { BlendFunction, KernelSize } from 'postprocessing';
import { useRef } from 'react';
import { breathPhase } from '../entities/breath/traits';

interface AtmosphericEffectsProps {
  /**
   * Bloom intensity (0 = disabled).
   * @default 0.3
   */
  bloomIntensity?: number;

  /**
   * Vignette darkness (0 = disabled).
   * @default 0.4
   */
  vignetteDarkness?: number;

  /**
   * Noise opacity (0 = disabled).
   * @default 0.03
   */
  noiseOpacity?: number;

  /**
   * Enable breathing synchronization.
   * @default true
   */
  breathingSyncEnabled?: boolean;
}

export function AtmosphericEffects({
  bloomIntensity = 0.3,
  vignetteDarkness = 0.4,
  noiseOpacity = 0.03,
  breathingSyncEnabled = true,
}: AtmosphericEffectsProps = {}) {
  const world = useWorld();
  // biome-ignore lint/suspicious/noExplicitAny: postprocessing effect refs don't export proper types
  const bloomRef = useRef<any>(null);
  // biome-ignore lint/suspicious/noExplicitAny: postprocessing effect refs don't export proper types
  const vignetteRef = useRef<any>(null);

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

  // Animate effects with breathing
  useFrame(() => {
    const phase = getBreathPhase();

    // Bloom intensifies slightly on inhale
    if (bloomRef.current && bloomIntensity > 0) {
      bloomRef.current.intensity = bloomIntensity + phase * 0.15;
    }

    // Vignette softens on inhale (more open feeling)
    if (vignetteRef.current && vignetteDarkness > 0) {
      vignetteRef.current.darkness = vignetteDarkness - phase * 0.1;
    }
  });

  return (
    <EffectComposer>
      <Bloom
        ref={bloomRef}
        intensity={bloomIntensity}
        luminanceThreshold={0.8}
        luminanceSmoothing={0.9}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />
      <Vignette
        ref={vignetteRef}
        offset={0.3}
        darkness={vignetteDarkness}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise opacity={noiseOpacity} blendFunction={BlendFunction.SOFT_LIGHT} />
    </EffectComposer>
  );
}
