/**
 * BreathingLevel - Core meditation environment.
 *
 * This component serves as the primary composition layer for the breathing experience,
 * integrating the central sphere, particle swarm, lighting, and environment.
 *
 * TRIPLEX COMPOSITION PATTERN:
 * This scene follows a "Transparent Pass-through" pattern. It exposes high-level
 * configuration props (presets, density, mood) while delegating fine-grained visual
 * properties (colors, scales, opacities) to the individual entity components.
 *
 * - Entity components (BreathingSphere, ParticleSwarm, etc.) own their canonical defaults.
 * - BreathingLevel only provides defaults for scene-wide properties (background, bloom).
 * - This ensures a single source of truth and allows for deep visual tuning in Triplex
 *   by selecting the specific entity in the scene graph.
 */

import { PostProcessing } from '../components/PostProcessing';
import { BreathingSphere } from '../entities/breathingSphere';
import { Environment } from '../entities/environment';
import { Lighting } from '../entities/lighting';
import {
  FibonacciLayout,
  JitterBehavior,
  MoodColorBehavior,
  OrbitBehavior,
  ParticleRenderer,
  ParticleSwarm,
  RepulsionBehavior,
  WindBehavior,
} from '../entities/particle';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * Main breathing meditation level.
 */
export function BreathingLevel({
  backgroundColor = '#0a0f1a',
  bloom = 'subtle',
  lightingPreset,
  lightingIntensity,
  environmentPreset,
  environmentAtmosphere,
  particleDensity,
}: Partial<BreathingLevelProps> = {}) {
  const particleCount =
    particleDensity === 'sparse' ? 150 : particleDensity === 'dense' ? 600 : 300;

  return (
    <>
      <color attach="background" args={[backgroundColor]} />

      <Lighting preset={lightingPreset} intensity={lightingIntensity} />

      <Environment preset={environmentPreset} atmosphere={environmentAtmosphere} />

      <BreathingSphere />

      <group>
        <ParticleSwarm count={particleCount}>
          <FibonacciLayout />
          <OrbitBehavior />
          <WindBehavior />
          <JitterBehavior />
          <RepulsionBehavior />
          <MoodColorBehavior />
        </ParticleSwarm>
        <ParticleRenderer />
      </group>

      <PostProcessing bloom={bloom} />
    </>
  );
}

export default BreathingLevel;
