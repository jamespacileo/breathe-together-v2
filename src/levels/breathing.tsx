import { Html, PresentationControls } from '@react-three/drei';
import { Suspense, useMemo, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GaiaUI } from '../components/GaiaUI';
import { EarthGlobe } from '../entities/earthGlobe';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { generateMockPresence } from '../lib/mockPresence';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * Tuning defaults for visual aesthetics (matching reference)
 */
const TUNING_DEFAULTS = {
  particleCounts: { sparse: 24, normal: 48, dense: 96 },
  refraction: 1.3, // IOR matching reference
  backfaceIntensity: 0.3, // Backface normal blending
  baseRadius: 4.5, // Orbit radius matching reference
  expansion: 2.0, // Breathing expansion
  atmosphericParticleCount: 100,
};

/**
 * BreathingLevel - Core meditation environment.
 * Uses 3-pass FBO refraction pipeline for Monument Valley frosted glass effect.
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
  const [breath, setBreath] = useState(0.3);
  const [expansion, setExpansion] = useState(TUNING_DEFAULTS.expansion);

  const moods = useMemo(() => generateMockPresence(harmony).moods, [harmony]);

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {/* 3-Pass FBO Refraction Pipeline handles background + refraction rendering */}
        <RefractionPipeline ior={refraction} backfaceIntensity={TUNING_DEFAULTS.backfaceIntensity}>
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
            {showGlobe && <EarthGlobe />}

            {showParticles && (
              <ParticleSwarm
                count={harmony}
                users={moods}
                baseRadius={TUNING_DEFAULTS.baseRadius}
              />
            )}

            {showParticles && (
              <AtmosphericParticles
                count={TUNING_DEFAULTS.atmosphericParticleCount}
                size={0.08}
                baseOpacity={0.1}
                breathingOpacity={0.15}
              />
            )}
          </PresentationControls>
        </RefractionPipeline>

        {/* UI stays OUTSIDE pipeline (fixed HUD) */}
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
      </Suspense>
    </ErrorBoundary>
  );
}

export default BreathingLevel;
