import { Leva } from 'leva';
import { Perf } from 'r3f-perf';
import { Suspense } from 'react';
import { AudioDevControls } from '../audio';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { FadeGroup } from '../components/FadeGroup';
import { MomentumControls } from '../components/MomentumControls';
import { SimpleGaiaUI } from '../components/SimpleGaiaUI';
import { TopRightControls } from '../components/TopRightControls';
import { DEV_MODE_ENABLED } from '../config/devMode';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { useDevControls } from '../hooks/useDevControls';
import { useSceneFadeIn } from '../hooks/useFadeIn';
import { usePresence } from '../hooks/usePresence';
import { useBreathingLevelStore } from '../stores/breathingLevelStore';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * BreathingLevel - Core 3D meditation environment.
 * Uses 3-pass FBO refraction pipeline for Monument Valley frosted glass effect.
 *
 * This component handles ONLY the 3D scene content.
 * HTML UI is rendered separately via BreathingLevelUI (outside Canvas).
 *
 * User controls: Harmony, Shard Size, Breathing Space, Atmosphere (via Zustand store)
 * Dev controls: Glass effect, DoF, Environment, Debug (via Leva panel)
 */
export function BreathingLevel({
  // DEBUG-ONLY: Entity visibility toggles (all default true)
  showGlobe = true,
  showParticles = true,
  showEnvironment = true,
  // Scene readiness for staggered fade-in
  sceneReady = false,
}: Partial<BreathingLevelProps> = {}) {
  // Shared state from Zustand store
  const { orbitRadius, shardSize, atmosphereDensity } = useBreathingLevelStore();

  // Dev controls (Leva)
  const devControls = useDevControls();

  // Staggered fade-in for cinematic reveal
  // Only starts animating when sceneReady becomes true
  const fadeIn = useSceneFadeIn(sceneReady);

  // Presence API (synchronized user positions)
  // Users array is sorted by ID on server, ensuring identical particle positions
  // across all connected clients for a shared visual experience
  const { users } = usePresence();

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {/* Performance monitor (dev only) */}
        {DEV_MODE_ENABLED && devControls.showPerfMonitor && (
          <Perf
            position={devControls.perfPosition}
            minimal={devControls.perfMinimal}
            showGraph={devControls.perfShowGraph}
            logsPerSecond={devControls.perfLogsPerSecond}
            antialias={devControls.perfAntialias}
            overClock={devControls.perfOverClock}
            deepAnalyze={devControls.perfDeepAnalyze}
            matrixUpdate={devControls.perfMatrixUpdate}
          />
        )}

        {/* Audio dev controls - adds Audio folder to Leva panel in dev mode */}
        <AudioDevControls />

        {/* 4-Pass FBO Refraction Pipeline */}
        <RefractionPipeline
          ior={devControls.ior}
          backfaceIntensity={devControls.glassDepth}
          enableDepthOfField={devControls.enableDepthOfField}
          focusDistance={devControls.focusDistance}
          focalRange={devControls.focalRange}
          maxBlur={devControls.maxBlur}
        >
          {/* Environment - clouds, lighting, fog */}
          {/* Fades in first (delay: 0ms) - establishes scene mood */}
          {showEnvironment && (
            <FadeGroup opacity={fadeIn.environment} name="Environment Fade">
              <Environment
                showClouds={devControls.showClouds}
                showStars={devControls.showStars}
                cloudOpacity={devControls.cloudOpacity}
                cloudSpeed={devControls.cloudSpeed}
                ambientLightColor={devControls.ambientLightColor}
                ambientLightIntensity={devControls.ambientLightIntensity}
                keyLightColor={devControls.keyLightColor}
                keyLightIntensity={devControls.keyLightIntensity}
              />
            </FadeGroup>
          )}

          {/* MomentumControls - iOS-style momentum scrolling for 3D rotation */}
          <MomentumControls
            cursor={true}
            speed={devControls.dragSpeed}
            damping={devControls.dragDamping}
            momentum={devControls.dragMomentum}
            timeConstant={devControls.dragTimeConstant}
            velocityMultiplier={devControls.dragVelocityMultiplier}
            minVelocityThreshold={devControls.dragMinVelocity}
            polar={[-Math.PI * 0.3, Math.PI * 0.3]}
            azimuth={[-Infinity, Infinity]}
          >
            {/* Globe fades in second (delay: 400ms) - central focal point */}
            {showGlobe && (
              <FadeGroup opacity={fadeIn.globe} name="Globe Fade">
                <EarthGlobe />
              </FadeGroup>
            )}

            {/* Particles fade in third (delay: 800ms) - detail layer */}
            {showParticles && (
              <FadeGroup opacity={fadeIn.particles} name="Particles Fade">
                <ParticleSwarm users={users} baseRadius={orbitRadius} maxShardSize={shardSize} />
              </FadeGroup>
            )}

            {/* Atmospheric particles fade in last (delay: 1200ms) - ambient polish */}
            {showParticles && (
              <FadeGroup opacity={fadeIn.atmosphere} name="Atmosphere Fade">
                <AtmosphericParticles
                  count={Math.round(atmosphereDensity)}
                  size={devControls.atmosphereParticleSize}
                  baseOpacity={devControls.atmosphereBaseOpacity}
                  breathingOpacity={devControls.atmosphereBreathingOpacity}
                  color={devControls.atmosphereColor}
                />
              </FadeGroup>
            )}
          </MomentumControls>
        </RefractionPipeline>
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * BreathingLevelUI - HTML UI overlay for the breathing meditation.
 *
 * Rendered OUTSIDE the Canvas as a sibling element.
 * This ensures proper event handling - HTML elements naturally receive
 * pointer events without conflicting with 3D scene interactions.
 *
 * Uses eventSource pattern on Canvas (see app.tsx).
 */
export function BreathingLevelUI() {
  // Shared state from Zustand store
  const {
    harmony,
    setHarmony,
    orbitRadius,
    setOrbitRadius,
    shardSize,
    setShardSize,
    atmosphereDensity,
    setAtmosphereDensity,
    showTuneControls,
    setShowTuneControls,
    showSettings,
    setShowSettings,
    applyPreset,
  } = useBreathingLevelStore();

  // Presence API for user count display
  const { count: presenceCount } = usePresence();

  return (
    <>
      {/* Leva dev controls panel - renders via portal to document.body */}
      <Leva
        hidden={!DEV_MODE_ENABLED}
        collapsed={true}
        titleBar={{ title: 'Dev Controls' }}
        theme={{
          sizes: {
            rootWidth: '280px',
          },
        }}
      />

      {/* Top-right control icons */}
      <TopRightControls
        onOpenTuneControls={() => setShowTuneControls(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main UI with breathing phase, inspirational text, and modals */}
      <SimpleGaiaUI
        harmony={harmony}
        setHarmony={setHarmony}
        orbitRadius={orbitRadius}
        setOrbitRadius={setOrbitRadius}
        shardSize={shardSize}
        setShardSize={setShardSize}
        atmosphereDensity={atmosphereDensity}
        setAtmosphereDensity={setAtmosphereDensity}
        onApplyPreset={applyPreset}
        showTuneControls={showTuneControls}
        onShowTuneControlsChange={setShowTuneControls}
        showSettings={showSettings}
        onShowSettingsChange={setShowSettings}
        presenceCount={presenceCount}
      />
    </>
  );
}

export default BreathingLevel;
