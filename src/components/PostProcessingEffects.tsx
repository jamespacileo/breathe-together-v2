/**
 * PostProcessingEffects - @react-three/postprocessing based effects
 *
 * Replaces custom DoF implementation in RefractionPipeline with battle-tested
 * postprocessing library. Provides DepthOfField with bokeh simulation and optional Bloom.
 *
 * Benefits over custom implementation:
 * - Better optimized DoF with proper bokeh shapes
 * - Easier to extend with additional effects (Bloom, N8AO, TiltShift)
 * - Cleaner separation of concerns (material vs post-processing)
 * - Reduced custom shader code (~100 lines vs 650 in RefractionPipeline)
 */

import {
  Bloom,
  DepthOfField,
  EffectComposer,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize, ToneMappingMode } from 'postprocessing';
import type { ReactElement } from 'react';

export interface PostProcessingEffectsProps {
  /**
   * Enable depth of field effect
   * @default true
   */
  enableDoF?: boolean;
  /**
   * Focus distance from camera in world units
   * @min 1 @max 30 @step 0.5
   * @default 8
   */
  focusDistance?: number;
  /**
   * Focal length - affects bokeh intensity
   * @min 0.01 @max 0.1 @step 0.005
   * @default 0.02
   */
  focalLength?: number;
  /**
   * Bokeh scale - size of out-of-focus blur circles
   * @min 0 @max 10 @step 0.5
   * @default 3
   */
  bokehScale?: number;
  /**
   * Enable bloom effect for glowing highlights
   * @default true
   */
  enableBloom?: boolean;
  /**
   * Bloom intensity
   * @min 0 @max 2 @step 0.1
   * @default 0.3
   */
  bloomIntensity?: number;
  /**
   * Bloom luminance threshold - pixels above this brightness get bloom
   * @min 0 @max 1 @step 0.05
   * @default 0.9
   */
  bloomThreshold?: number;
  /**
   * Bloom smoothing - transition smoothness around threshold
   * @min 0 @max 1 @step 0.05
   * @default 0.025
   */
  bloomSmoothing?: number;
  /**
   * Enable vignette effect (darker edges)
   * @default false
   */
  enableVignette?: boolean;
  /**
   * Vignette darkness
   * @min 0 @max 1 @step 0.05
   * @default 0.3
   */
  vignetteDarkness?: number;
  /**
   * Vignette offset from center
   * @min 0 @max 1 @step 0.05
   * @default 0.3
   */
  vignetteOffset?: number;
}

/**
 * PostProcessingEffects - Renders postprocessing effects stack
 *
 * Usage:
 * ```tsx
 * <Canvas>
 *   <PostProcessingEffects
 *     enableDoF={true}
 *     focusDistance={8}
 *     enableBloom={true}
 *     bloomIntensity={0.3}
 *   />
 *   {/* scene content *\/}
 * </Canvas>
 * ```
 */
export function PostProcessingEffects({
  enableDoF = true,
  focusDistance = 8,
  focalLength = 0.02,
  bokehScale = 3,
  enableBloom = true,
  bloomIntensity = 0.3,
  bloomThreshold = 0.9,
  bloomSmoothing = 0.025,
  enableVignette = false,
  vignetteDarkness = 0.3,
  vignetteOffset = 0.3,
}: PostProcessingEffectsProps) {
  // Skip rendering if all effects disabled
  if (!enableDoF && !enableBloom && !enableVignette) {
    return null;
  }

  // Build effects array based on enabled flags
  const effects: ReactElement[] = [];

  if (enableDoF) {
    effects.push(
      <DepthOfField
        key="dof"
        focusDistance={focusDistance}
        focalLength={focalLength}
        bokehScale={bokehScale}
      />,
    );
  }

  if (enableBloom) {
    effects.push(
      <Bloom
        key="bloom"
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={bloomSmoothing}
        kernelSize={KernelSize.MEDIUM}
        blendFunction={BlendFunction.ADD}
      />,
    );
  }

  if (enableVignette) {
    effects.push(
      <Vignette
        key="vignette"
        darkness={vignetteDarkness}
        offset={vignetteOffset}
        blendFunction={BlendFunction.NORMAL}
      />,
    );
  }

  // Tone mapping should be applied last to map HDR values to display space.
  effects.push(
    <ToneMapping
      key="tone-mapping"
      mode={ToneMappingMode.ACES_FILMIC}
      blendFunction={BlendFunction.SRC}
    />,
  );

  // Type assertion needed because EffectComposer expects Element | Element[]
  return <EffectComposer multisampling={0}>{effects}</EffectComposer>;
}

export default PostProcessingEffects;
