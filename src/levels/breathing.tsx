import { Environment, Html, PresentationControls } from '@react-three/drei';
import { Suspense, useMemo, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GaiaUI } from '../components/GaiaUI';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment as SceneEnvironment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { generateMockPresence } from '../lib/mockPresence';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * Tuning defaults for visual aesthetics
 */
const TUNING_DEFAULTS = {
  particleCounts: { sparse: 150, normal: 300, dense: 600 },
  earthRotationSpeed: 0.1,
  atmosphericParticleCount: 100,
};

/**
 * BreathingLevel - Core meditation environment.
 */
export function BreathingLevel({
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

  const moods = useMemo(() => generateMockPresence(300).moods, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {/* Environment stays OUTSIDE rotatable group (fixed background) */}
        <SceneEnvironment enabled={showEnvironment} />

        {/* Add HDR environment for realistic reflections on ceramic surfaces */}
        <Environment preset="city" environmentIntensity={0.5} />

        {/* Wrap rotatable entities in PresentationControls */}
        <PresentationControls
          global
          cursor={true}
          snap={false}
          speed={1}
          damping={0.3}
          polar={[-Math.PI * 0.3, Math.PI * 0.3]}
          azimuth={[-Infinity, Infinity]}
        >
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
        </PresentationControls>

        {/* UI stays OUTSIDE rotatable group (fixed HUD) */}
        <Html fullscreen>
          <GaiaUI harmony={harmony} setHarmony={setHarmony} />
        </Html>
      </Suspense>
    </ErrorBoundary>
  );
}

export default BreathingLevel;
