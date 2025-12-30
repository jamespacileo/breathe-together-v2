/**
 * PostProcessing - Breathing-synchronized visual effects
 *
 * Adds subtle polish through @react-three/postprocessing:
 * - Bloom: Soft glow on bright areas, intensifies on inhale
 * - Vignette: Subtle edge darkening, softens on inhale
 * - Noise: Film grain for organic texture
 *
 * Note: Works alongside the custom RefractionPipeline as it renders
 * as a final pass after all scene rendering is complete.
 */

import { useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { useWorld } from 'koota/react';
import { BlendFunction } from 'postprocessing';
import { useRef } from 'react';
import { breathPhase } from '../entities/breath/traits';

export interface PostProcessingProps {
  /**
   * Enable bloom effect for soft glow.
   * @default true
   */
  enableBloom?: boolean;

  /**
   * Enable vignette effect for edge darkening.
   * @default true
   */
  enableVignette?: boolean;

  /**
   * Enable film grain noise.
   * @default true
   */
  enableNoise?: boolean;

  /**
   * Base bloom intensity (before breathing modulation).
   * @default 0.15
   */
  bloomIntensity?: number;

  /**
   * Bloom intensity added on inhale.
   * @default 0.1
   */
  bloomBreathingRange?: number;

  /**
   * Base vignette darkness (before breathing modulation).
   * @default 0.35
   */
  vignetteDarkness?: number;

  /**
   * Film grain opacity.
   * @default 0.08
   */
  noiseOpacity?: number;
}

/**
 * PostProcessing - Adds breathing-synchronized visual polish
 *
 * Bloom makes shards and highlights glow softly, intensifying on inhale.
 * Vignette creates focus on center, softening on inhale for expansive feel.
 * Noise adds organic film grain texture matching watercolor aesthetic.
 */
export function PostProcessing({
  enableBloom = true,
  enableVignette = true,
  enableNoise = true,
  bloomIntensity = 0.15,
  bloomBreathingRange = 0.1,
  vignetteDarkness = 0.35,
  noiseOpacity = 0.08,
}: PostProcessingProps) {
  const world = useWorld();
  // biome-ignore lint/suspicious/noExplicitAny: postprocessing library doesn't export proper types for effect refs
  const bloomRef = useRef<any>(null);
  // biome-ignore lint/suspicious/noExplicitAny: postprocessing library doesn't export proper types for effect refs
  const vignetteRef = useRef<any>(null);

  // Update effects based on breathing phase
  useFrame(() => {
    try {
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get?.(breathPhase)?.value ?? 0;

        // Bloom intensifies on inhale (creates expansive, glowing feel)
        if (bloomRef.current) {
          bloomRef.current.intensity = bloomIntensity + phase * bloomBreathingRange;
        }

        // Vignette softens on inhale (opens up the view)
        if (vignetteRef.current) {
          vignetteRef.current.darkness = vignetteDarkness - phase * 0.1;
        }
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  // All effects are always rendered; disable by setting intensity/opacity to 0
  // This avoids TypeScript issues with conditional children in EffectComposer
  return (
    <EffectComposer>
      <Bloom
        ref={bloomRef}
        intensity={enableBloom ? bloomIntensity : 0}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.9}
        mipmapBlur={true}
        radius={0.85}
      />

      <Vignette
        ref={vignetteRef}
        offset={0.35}
        darkness={enableVignette ? vignetteDarkness : 0}
        blendFunction={BlendFunction.NORMAL}
      />

      <Noise opacity={enableNoise ? noiseOpacity : 0} blendFunction={BlendFunction.SOFT_LIGHT} />
    </EffectComposer>
  );
}

export default PostProcessing;
