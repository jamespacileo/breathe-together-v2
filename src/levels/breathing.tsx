import { Html } from '@react-three/drei';
import { Suspense, useMemo, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GaiaUI } from '../components/GaiaUI';
import { PostProcessing } from '../components/PostProcessing';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RotatableScene } from '../entities/rotatableScene';
import { generateMockPresence } from '../lib/mockPresence';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * Tuning defaults for visual aesthetics
 */
const TUNING_DEFAULTS = {
  particleCounts: { sparse: 150, normal: 300, dense: 600 },
  refraction: 1.4,
  breath: 0.3,
  expansion: 2.0,
  earthRotationSpeed: 0.1,
  atmosphericParticleCount: 100,
};

/**
 * BreathingLevel - Core meditation environment.
 */
export function BreathingLevel({
  bloom = 'none',
  particleDensity,
  // DEBUG-ONLY: Entity visibility toggles (all default true)
  showGlobe = true,
  showParticles = true,
  showEnvironment = true,
}: Partial<BreathingLevelProps> = {}) {
  // UI State for tuning the aesthetic
  const [harmony, setHarmony] = useState(
    particleDensity === 'sparse'
      ? TUNING_DEFAULTS.particleCounts.sparse
      : particleDensity === 'dense'
        ? TUNING_DEFAULTS.particleCounts.dense
        : TUNING_DEFAULTS.particleCounts.normal,
  );
  const [refraction, setRefraction] = useState(TUNING_DEFAULTS.refraction);
  const [breath, setBreath] = useState(TUNING_DEFAULTS.breath);
  const [expansion, setExpansion] = useState(TUNING_DEFAULTS.expansion);

  const moods = useMemo(() => generateMockPresence(300).moods, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {/* Environment stays OUTSIDE rotatable group (fixed background) */}
        <Environment enabled={showEnvironment} />

        {/* Wrap rotatable entities in RotatableScene */}
        <RotatableScene enableRotation={true}>
          {showGlobe && <EarthGlobe rotationSpeed={TUNING_DEFAULTS.earthRotationSpeed} />}

          {showParticles && <ParticleSwarm capacity={harmony} users={moods} />}

          {showParticles && (
            <AtmosphericParticles
              count={TUNING_DEFAULTS.atmosphericParticleCount}
              size={0.08}
              baseOpacity={0.1}
              breathingOpacity={0.15}
            />
          )}
        </RotatableScene>

        {/* UI stays OUTSIDE rotatable group (fixed HUD) */}
        <Html fullscreen>
          <GaiaUI
            harmony={harmony}
            setHarmony={setHarmony}
            refraction={refraction}
            setRefraction={setRefraction}
            breath={breath}
            setBreath={setBreath}
            expansion={expansion}
            setExpansion={setExpansion}
          />
        </Html>

        <PostProcessing bloom={bloom} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default BreathingLevel;
