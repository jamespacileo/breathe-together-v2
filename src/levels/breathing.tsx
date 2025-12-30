import { Html, PresentationControls } from '@react-three/drei';
import { Suspense, useMemo, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GaiaUI } from '../components/GaiaUI';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ForegroundParticles } from '../entities/particle/ForegroundParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { generateMockPresence } from '../lib/mockPresence';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * Tuning defaults for visual aesthetics (matching reference)
 */
const TUNING_DEFAULTS = {
  particleCounts: { sparse: 24, normal: 48, dense: 96 },
  ior: 1.3, // Index of Refraction
  backfaceIntensity: 0.3, // Glass depth/distortion
  orbitRadius: 4.5, // Base orbit radius
  shardSize: 0.5, // Max shard size
  atmosphereDensity: 100, // Atmospheric particle count
};

/**
 * BreathingLevel - Core meditation environment.
 * Uses 3-pass FBO refraction pipeline for Monument Valley frosted glass effect.
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
  const [ior, setIor] = useState(TUNING_DEFAULTS.ior);
  const [glassDepth, setGlassDepth] = useState(TUNING_DEFAULTS.backfaceIntensity);
  const [orbitRadius, setOrbitRadius] = useState(TUNING_DEFAULTS.orbitRadius);
  const [shardSize, setShardSize] = useState(TUNING_DEFAULTS.shardSize);
  const [atmosphereDensity, setAtmosphereDensity] = useState(TUNING_DEFAULTS.atmosphereDensity);

  const moods = useMemo(() => generateMockPresence(harmony).moods, [harmony]);

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {/* 3-Pass FBO Refraction Pipeline handles background + refraction rendering */}
        <RefractionPipeline ior={ior} backfaceIntensity={glassDepth}>
          {/* Monument Valley inspired atmosphere - clouds, lighting, fog */}
          {showEnvironment && (
            <Environment
              showClouds={true}
              showStars={true}
              showForegroundClouds={true}
              cloudOpacity={0.5}
            />
          )}

          {/* Layered depth particles - creates atmospheric depth */}
          {showParticles && <ForegroundParticles countPerLayer={40} baseOpacity={0.12} />}

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
                baseRadius={orbitRadius}
                maxShardSize={shardSize}
              />
            )}

            {showParticles && (
              <AtmosphericParticles
                count={atmosphereDensity}
                size={0.1}
                baseOpacity={0.15}
                breathingOpacity={0.2}
                scaleBreathingRange={0.2}
              />
            )}
          </PresentationControls>
        </RefractionPipeline>

        {/* NOTE: EffectComposer postprocessing disabled - conflicts with RefractionPipeline's
            3-pass FBO rendering. The EffectComposer re-renders the scene with original materials,
            overwriting the refraction effect. Atmospheric effects are achieved via:
            - ForegroundParticles (layered depth)
            - Environment clouds (foreground/midground/background)
            - BackgroundGradient shader (breathing-sync color/cloud intensity)
        */}

        {/* UI stays OUTSIDE pipeline (fixed HUD) */}
        <Html fullscreen>
          <GaiaUI
            harmony={harmony}
            setHarmony={setHarmony}
            ior={ior}
            setIor={setIor}
            glassDepth={glassDepth}
            setGlassDepth={setGlassDepth}
            orbitRadius={orbitRadius}
            setOrbitRadius={setOrbitRadius}
            shardSize={shardSize}
            setShardSize={setShardSize}
            atmosphereDensity={atmosphereDensity}
            setAtmosphereDensity={setAtmosphereDensity}
          />
        </Html>
      </Suspense>
    </ErrorBoundary>
  );
}

export default BreathingLevel;
