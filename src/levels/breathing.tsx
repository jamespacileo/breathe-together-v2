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

import { Suspense } from 'react';
import { PostProcessing } from '../components/PostProcessing';
import { BreathingSphere } from '../entities/breathingSphere';
import { Environment } from '../entities/environment';
import { Balanced } from '../entities/particle/presets';
import { usePresence } from '../hooks/usePresence';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * Main breathing meditation level.
 *
 * **Debug Note:** Entity visibility toggles (showSphere, showParticles, etc.) are debug-only
 * and default to true. They are primarily used in debug scenes to isolate specific entities.
 */
export function BreathingLevel({
  bloom = 'medium',
  environmentPreset = 'studio',
  environmentAtmosphere,
  particleDensity,
  // DEBUG-ONLY: Entity visibility toggles (all default true)
  showSphere = true,
  showParticles = true,
  showEnvironment = true,
}: Partial<BreathingLevelProps> = {}) {
  const particleCount =
    particleDensity === 'sparse' ? 150 : particleDensity === 'dense' ? 600 : 300;

  const { moods } = usePresence();

  return (
    <Suspense fallback={null}>
      {showEnvironment && (
        <Environment preset={environmentPreset} atmosphere={environmentAtmosphere} />
      )}

      {showSphere && <BreathingSphere />}
      {showParticles && <Balanced capacity={particleCount} users={moods} />}

      <PostProcessing bloom={bloom} />
    </Suspense>
  );
}

export default BreathingLevel;
