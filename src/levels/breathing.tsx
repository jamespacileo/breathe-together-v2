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
import { ParticleSwarm } from '../entities/particle';
import { usePresence } from '../hooks/usePresence';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * Main breathing meditation level.
 *
 * **Debug Note:** Entity visibility toggles (showSphere, showParticles, etc.) are debug-only
 * and default to true. They are primarily used in debug scenes to isolate specific entities.
 */
export function BreathingLevel({
  backgroundColor = '#0a0f1a',
  bloom = 'subtle',
  lightingPreset,
  lightingIntensity,
  environmentPreset,
  environmentAtmosphere,
  particleDensity,
  // DEBUG-ONLY: Entity visibility toggles (all default true)
  showSphere = true,
  showParticles = true,
  showLighting = true,
  showEnvironment = true,
}: Partial<BreathingLevelProps> = {}) {
  const particleCount =
    particleDensity === 'sparse' ? 150 : particleDensity === 'dense' ? 600 : 300;

  const { moods } = usePresence();

  return (
    <>
      {/* Background now handled by gradient shader in Environment */}
      {/* <color attach="background" args={[backgroundColor]} /> */}

      {showLighting && <Lighting preset={lightingPreset} intensity={lightingIntensity} />}

      {showEnvironment && (
        <Environment preset={environmentPreset} atmosphere={environmentAtmosphere} />
      )}

      {showSphere && <BreathingSphere />}

      {showParticles && <ParticleSwarm capacity={particleCount} users={moods} />}

      <PostProcessing bloom={bloom} />
    </>
  );
}

export default BreathingLevel;
