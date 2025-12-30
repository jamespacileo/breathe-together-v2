import { PresentationControls } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { generateMockPresence } from '../lib/mockPresence';

/**
 * Visual tuning props passed from app.tsx via GaiaUIOverlay settings
 */
export interface BreathingLevelProps {
  /** Particle count (harmony) */
  harmony?: number;
  /** Index of Refraction - controls light bending through glass */
  ior?: number;
  /** Glass depth - controls backface normal blending/distortion */
  glassDepth?: number;
  /** Orbit radius - how far particles orbit from center */
  orbitRadius?: number;
  /** Shard size - maximum size of glass shards */
  shardSize?: number;
  /** Atmosphere density - number of ambient floating particles */
  atmosphereDensity?: number;
  /** DEBUG-ONLY: Show/hide globe entity */
  showGlobe?: boolean;
  /** DEBUG-ONLY: Show/hide particles */
  showParticles?: boolean;
  /** DEBUG-ONLY: Show/hide environment */
  showEnvironment?: boolean;
}

/**
 * Tuning defaults for visual aesthetics (matching reference)
 */
const DEFAULTS = {
  harmony: 48,
  ior: 1.3,
  glassDepth: 0.3,
  orbitRadius: 4.5,
  shardSize: 0.5,
  atmosphereDensity: 100,
};

/**
 * BreathingLevel - Core meditation environment.
 * Uses 3-pass FBO refraction pipeline for Monument Valley frosted glass effect.
 *
 * All visual tuning is controlled via props from app.tsx settings panel.
 */
export function BreathingLevel({
  harmony = DEFAULTS.harmony,
  ior = DEFAULTS.ior,
  glassDepth = DEFAULTS.glassDepth,
  orbitRadius = DEFAULTS.orbitRadius,
  shardSize = DEFAULTS.shardSize,
  atmosphereDensity = DEFAULTS.atmosphereDensity,
  showGlobe = true,
  showParticles = true,
  showEnvironment = true,
}: BreathingLevelProps = {}) {
  const moods = useMemo(() => generateMockPresence(harmony).moods, [harmony]);

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {/* 3-Pass FBO Refraction Pipeline handles background + refraction rendering */}
        <RefractionPipeline ior={ior} backfaceIntensity={glassDepth}>
          {/* Monument Valley inspired atmosphere - clouds, lighting, fog */}
          {showEnvironment && <Environment showClouds={true} showStars={true} />}

          {/* Wrap rotatable entities in PresentationControls */}
          {/* NOTE: global={false} so events don't block DOM UI outside canvas */}
          <PresentationControls
            global={false}
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
                size={0.08}
                baseOpacity={0.1}
                breathingOpacity={0.15}
              />
            )}
          </PresentationControls>
        </RefractionPipeline>
      </Suspense>
    </ErrorBoundary>
  );
}

export default BreathingLevel;
