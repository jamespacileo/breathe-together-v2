import { Suspense } from 'react';
import { PostProcessing } from '../components/PostProcessing';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { usePresence } from '../hooks/usePresence';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * BreathingLevel - Core meditation environment.
 *
 * Monument Valley inspired breathing meditation with enhanced visual elements:
 * - EarthGlobe: Central Earth with frosted glass overlay
 * - AtmosphericParticles: Floating ambient particles
 * - ParticleSwarm: Orbiting icosahedral shards
 * - Environment: Gradient background and lighting
 * - PostProcessing: Bloom effects
 */
export function BreathingLevel({
  bloom = 'subtle',
  particleDensity,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: Kept for prop interface compatibility
  enableRefraction,
  refractionQuality,
  // DEBUG-ONLY: Entity visibility toggles (all default true)
  showGlobe = true,
  showParticles = true,
  showEnvironment = true,
}: Partial<BreathingLevelProps> = {}) {
  const particleCount =
    particleDensity === 'sparse' ? 150 : particleDensity === 'dense' ? 600 : 300;

  const { moods } = usePresence();

  return (
    <Suspense fallback={null}>
      <Environment enabled={showEnvironment} />

      {showGlobe && <EarthGlobe globeScale={2.0} rotationSpeed={0.1} />}

      {showParticles && (
        <ParticleSwarm
          capacity={particleCount}
          users={moods}
          enableRefraction={false}
          refractionQuality={refractionQuality}
        />
      )}

      {showParticles && (
        <AtmosphericParticles count={100} size={0.08} baseOpacity={0.1} breathingOpacity={0.15} />
      )}

      <PostProcessing bloom={bloom} />
    </Suspense>
  );
}

export default BreathingLevel;
