import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { HalfFloatType } from 'three';

export interface PostProcessingProps {
  /**
   * Bloom intensity preset.
   * @group "Scene Appearance"
   * @enum ["subtle", "medium", "dramatic", "none"]
   */
  bloom?: 'subtle' | 'medium' | 'dramatic' | 'none';
}

const BLOOM_PRESETS = {
  subtle: { intensity: 0.3, luminanceThreshold: 1.0, luminanceSmoothing: 0.1 },
  medium: { intensity: 0.5, luminanceThreshold: 0.9, luminanceSmoothing: 0.15 },
  dramatic: { intensity: 0.8, luminanceThreshold: 0.7, luminanceSmoothing: 0.2 },
} as const;

/**
 * PostProcessing - Handles scene-wide effects like Bloom.
 * Encapsulates preset logic to keep scenes clean for Triplex.
 */
export function PostProcessing({ bloom = 'subtle' }: PostProcessingProps = {}) {
  if (bloom === 'none') return null;

  const config = BLOOM_PRESETS[bloom as keyof typeof BLOOM_PRESETS] || BLOOM_PRESETS.subtle;

  return (
    <EffectComposer multisampling={4} stencilBuffer={false} frameBufferType={HalfFloatType}>
      <Bloom {...config} mipmapBlur />
    </EffectComposer>
  );
}
